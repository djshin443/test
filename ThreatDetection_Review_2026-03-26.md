# Threat Detection System — 심층 리뷰 보고서 (Opus 4.6)

> 작성일: 2026-03-26
> 문서 버전: 2026-03-26 (289p, 508KB)
> 리뷰어: Claude Opus 4.6 (1M context)
> 전체 텍스트 분석 기반

---

## 목차

1. [총평](#1-총평)
2. [아키텍처 평가](#2-아키텍처-평가)
3. [잘 설계된 부분 (10가지)](#3-잘-설계된-부분)
4. [문제점 및 취약점 (15가지)](#4-문제점-및-취약점)
5. [로직 가능성 검토](#5-로직-가능성-검토)
6. [이전 리뷰(Sonnet)와의 차이](#6-이전-리뷰와의-차이)
7. [핵심 개선 제안](#7-핵심-개선-제안)
8. [종합 점수 및 결론](#8-종합-점수-및-결론)

---

## 1. 총평

**"289페이지 문서가 증명하는 것은 이 시스템이 실제로 개발되고, 운영되고, 반복적으로 개선되었다는 사실이다. 이것 자체가 가장 큰 강점이다."**

이 시스템은 학술 논문이나 PoC가 아니다. 67건의 버그 수정, 15차에 걸친 로직 수정, v1.0.0부터 v2.6까지의 변경 이력, GPU 추론서버 분리, 야간 자동 재학습 파이프라인 — 이 모든 것이 **프로덕션 환경에서 실제로 돌아가는 시스템**임을 보여준다.

그러나 가장 심각한 결함은 여전하다: **"이 시스템이 실제로 얼마나 잘 탐지하는가?"에 대한 정량적 답이 문서 어디에도 없다.**

---

## 2. 아키텍처 평가

### 2.1 전체 구조

```
네트워크 → Suricata(Docker) → eve.json
     ↓
메인 프로세스(CPU)          GPU 추론서버(별도 프로세스)
  피처 추출(59개)    →    AE + XGBoost + IF 배치 추론
  500건 배치         ←    결과 반환 (1ms/flow)
     ↓
  합의 판정 → IP 평판 보정 → 행동 분석
     ↓
  blocked_ips / watched_ips / 통과
     ↓
  Benign 자동 수집 → 격리(3일) → 재학습
```

### 2.2 아키텍처 성숙도 판단

| 측면 | 수준 | 근거 |
|------|------|------|
| 모듈 분리 | 높음 | 26개 모듈, 6개 계층, 의존 관계 명확 |
| 스레드 안전성 | 높음 | 8단계 락 순서, RLock, TOCTOU 수정 완료 |
| 장애 복구 | 중상 | 원자적 I/O, 헬스체크, 자동 재시작 |
| 확장성 | 낮음 | 단일 서버, 수평 확장 불가 |
| 테스트 | 중상 | 126개 테스트, E2E 포함 |
| 운영 도구 | 높음 | 백업/복원, 배포 패키지, 야간 재학습, 상태 확인 |

---

## 3. 잘 설계된 부분

### ✅ 3-1. 2-프로세스 GPU 아키텍처 — 탁월

15차 최적화(2026-03-25)에서 도입한 **메인(CPU) + 추론서버(GPU) 분리 구조**는 이 시스템의 가장 인상적인 엔지니어링 결정이다.

- **문제**: TensorFlow가 100+ 스레드를 생성하여 GIL 경합 → 메인 프로세스 병목
- **해결**: `multiprocessing.Queue`로 500건 배치 전송, 별도 프로세스에서 GPU 추론
- **결과**: 단건 194ms → 1ms/flow (200배 개선), CPU 8%, GPU 258MB/24GB

이 설계는 단순히 성능만 올린 게 아니라, **Python GIL의 근본 한계를 프로세스 수준에서 회피**한 것이다. TensorFlow + XGBoost를 같은 프로세스에서 돌리는 많은 시스템이 겪는 문제를 깔끔하게 해결했다.

---

### ✅ 3-2. 5층 Benign 보호 체계 — 매우 우수

단순한 오탐 방지가 아니라 **"Benign 트래픽은 어떤 경로로도 절대 차단되지 않는다"**는 불변 조건(invariant)을 5개 층에서 강제한다:

```
[1층] ensemble_detector — Case 1~4 모두 xgb_attack_type != 'benign' 필터
[2층] ip_behavior_profiler — 평판 승격 시 Benign이면 승격 안 함
[3층] ip_behavior_profiler — 시간 상관 분석에서 Benign 제외
[4층] realtime_monitor — 행동 분석 승격 시 XGB Benign이면 관찰만
[5층] realtime_monitor — is_threat=True만 blocked_ips 등록
```

특히 "왜 오탐이 미탐보다 위험한가"에 대한 근거로 **2016년 호주 Census 사고**(정상 트래픽을 DDoS로 오인 → 국가 인구조사 8시간 마비)와 NIST SP 800-94를 인용한 것은 설계 결정에 현실적 근거를 부여한다. 이것은 "잘 모르겠으니 엄격하게" 접근이 아니라 **"차단형(IPS)이므로 오탐 최소화가 원칙"**이라는 명확한 설계 철학이다.

---

### ✅ 3-3. 야간 자동 재학습 + 무중단 모델 교체 — 매우 우수

`nightly_retrain.sh`의 6단계 파이프라인은 프로덕션 운영에 있어 핵심적인 문제를 해결한다:

```
새벽 2시 → 전처리(별도 경로) → CPU 학습 → 3중 검증 → 백업 → 모델 교체 → SIGUSR1 핫 리로드
```

**핵심 설계 결정들:**
- 학습은 `/data/soosan/nightly_work/`에서 수행 → **탐지 경로와 파일 충돌 없음**
- 3중 검증(파일 무결성 + 클래스별 정확도 + AE threshold 이상값) 실패 시 **아무것도 변경 안 함**
- `kill -SIGUSR1 main.py` → 모델 리로드 + 추론서버 재시작 → **탐지 중단 0초**

이 구조의 가장 중요한 특성은 **안전성**: 검증 통과 전까지 기존 모델을 절대 건드리지 않는다.

---

### ✅ 3-4. 앙상블 합의 로직 + 미학습 패턴 판정 — 독창적

`ae_consensus_max_error`(기본 50.0) 개념은 이 시스템의 가장 독창적인 설계다:

```python
untrained = is_anomaly and reconstruction_error > ae_consensus_max_error
ae_vote = is_anomaly and not untrained
if_vote = if_anomaly and not untrained  # AE와 같은 데이터로 학습 → 함께 불신
```

**"AE가 극단적으로 높은 에러를 반환하면, 그건 공격이 아니라 모르는 패턴이다"** — 이 통찰은 AE 기반 이상 탐지의 근본적 한계를 잘 이해하고 있음을 보여준다. AE threshold ~0.047 기준, error > 50은 1,000배 이상이므로 이는 공격 신호가 아니라 **도메인 외(Out-of-Distribution)** 입력이다.

더불어 **재학습 후 자동 복원** 메커니즘도 우아하다: AE가 새 패턴을 학습하면 error가 정상 범위로 내려오고, 합의 투표가 자동으로 살아난다.

---

### ✅ 3-5. 보안 아키텍처 — v1.2.3~v1.2.5 이후 견고

보안 이력을 추적하면 **현실적인 공격 시나리오에서 출발한 방어**임을 알 수 있다:

| 공격 시나리오 | 방어 | 버전 |
|-------------|------|------|
| 악성 pickle → RCE | RestrictedUnpickler 전면 적용 (6곳) | v1.2.3 |
| 모델 파일 변조 | HMAC-SHA256, 키 길이 ≥32B 강제 | v1.2.3 |
| CDN 도메인 프론팅 | 3-Tier 화이트리스트 (Tier2: 탐지+로그) | v1.2.3 |
| 심링크 공격 | 읽기/쓰기 모두 islink() 체크 | v1.2.3 |
| 공급망 공격 | requirements.txt == 정확한 버전 고정 | v1.2.3 |
| 증분학습 해시 불일치 | pickle 저장 시 .sha256 자동 생성 전면 적용 | v1.2.5 |
| 도메인 substring 우회 | `evil-google.com.attacker.kr` → suffix 매칭으로 차단 | v1.2.3 |

특히 v1.2.3 이전에 `safe_pickle_load()`가 존재했음에도 **6곳에서 raw `pickle.load()`를 직접 호출**하고 있었다는 점 — 그리고 이를 전수 검토로 발견하고 전면 교체한 과정은 보안 의식과 실행력 모두 높음을 보여준다.

---

### ✅ 3-6. 67건 버그 수정 이력 — 성숙한 개발 문화

버그 수정 이력은 단순히 "버그가 많았다"가 아니라 **"체계적으로 발견하고, 분류하고, 근본 원인을 해결했다"**를 보여준다:

**가장 인상적인 버그들:**
- **#1 Signal Handler 데드락** (CRITICAL): `_signal_handler`에서 `stop()` 직접 호출 → 메인 스레드 락 보유 중 시그널 → 영구 데드락. `kill -9`로만 종료 가능했다는 건 실제 운영 중 발견했다는 의미.
- **C1~C4 TOCTOU 레이스 조건**: `_new_X.csv` 존재 체크 후 append 사이 경합. 이런 종류의 버그는 **단위 테스트로 발견 불가**, 실제 멀티스레드 운영에서만 드러난다.
- **#64 benign/stratosphere → Botnet 오분류** (6차, CRITICAL): 경로 기반 라벨 추론에서 폴더 순서 역전. 이 버그 하나가 **전체 학습 데이터를 오염**시킬 수 있었다.

이런 수준의 버그를 발견하고 수정했다는 것은 시스템이 **실제 데이터로 실제 환경에서 장기 운영**되었음을 증명한다.

---

### ✅ 3-7. 차단/관찰 분리 체계 — 실용적

11차 로직 수정(2026-03-21)에서 도입한 `blocked_ips` vs `watched_ips` 분리는 운영 현실을 잘 반영한다:

```
확실한 위협 (다중 모델 합의 + 높은 확신) → blocked_ips.csv (즉시 차단)
불확실/이상 (AE 단독 or 낮은 확률)      → watched_ips.csv (관찰 기록)
정상                                    → 통과 (자동 학습)
```

"확실한 것만 차단하고, 나머지는 관찰한다"는 원칙은 **Alert Fatigue**(알림 피로) 문제를 직접 해결한다. Gartner 보고서 인용대로, IDS/IPS 실패 원인 1위가 오탐 과다이고, 이 시스템은 이를 설계 수준에서 방지한다.

---

### ✅ 3-8. 데이터 수집 파이프라인 — 포괄적

`download_datasets.sh`의 증분 다운로드 체계는 놀라울 정도로 포괄적이다:

- **정상**: MAWI(일본 백본) + CIC-IDS2018 + IoT-23 + WRCCDC + CTU-Normal + Kaggle + 공개 PCAP
- **악성**: MTA(2482+ 페이지 자동 크롤링) + CTU-Malware + 공개 PCAP
- **자체**: `collect_benign_ip.py`로 실시간 수집

특히 **MAWI 파이프라인**이 인상적이다: MAWILab 레이블로 이상 IP를 제외한 후 정상 flow만 추출 → 학습 → 원본 삭제까지 자동화. MAWILab이 4개 독립 이상 탐지기 앙상블이라는 점에서 레이블 신뢰도도 높다.

다만 MAWILab이 2024년 12월 운영 종료했으므로, 이후 날짜는 스킵된다는 점을 명시한 것도 정직하다.

---

### ✅ 3-9. 교육 자료 및 운영 문서 — 매우 우수

289페이지 중 상당 부분이 교육 자료(PRESENTATION, EDUCATION, DETECTION_GUIDE 등)와 운영 가이드다. 이는 **"개발자 한 명만 이해하는 시스템"이 아닌 "팀이 운영할 수 있는 시스템"**을 지향한다는 증거다.

특히:
- 탐지 흐름의 11단계를 시각적으로 설명 (DETECTION_FLOW)
- "왜 이런 판정을 내리는지" 근거와 설계 철학 명시 (DETECTION_LOGIC)
- 비전문가용 쉬운 발표 자료 (PRESENTATION_EASY)
- 상황별 실행 매뉴얼 (OPERATION_GUIDE)

---

### ✅ 3-10. Unknown Attack 분류 워크플로우 — 현실적

`classify_unknown.sh`의 대화형 도구는 **사람이 개입하는 정확한 지점**을 잘 설계했다:

1. HDBSCAN이 자동 군집화
2. XGBoost의 **내부 확률** 기반 AI 추천 제공 (예: "DDoS 72%, DoS 15%")
3. 관리자가 선택
4. 증분 학습 자동 실행

90%+ 확신 시 `--auto` 자동 승인도 가능. 이 설계는 **완전 자동과 완전 수동 사이의 실용적 균형점**이다.

---

## 4. 문제점 및 취약점

### ❌ 4-1. 실측 성능 데이터 전무 — 가장 심각

**289페이지 문서에 Detection Rate, False Positive Rate, F1 Score, ROC-AUC 등 단 하나의 수치도 없다.**

이것이 가장 심각한 문제인 이유:
- "RTX A5000에서 1ms/flow" — 이건 **추론 속도**지 **정확도**가 아니다
- "7단계 오탐 방어" — 설계는 좋지만 **실제로 FPR이 몇 %인지** 모른다
- "151M+ 샘플로 학습" — 데이터양이지 **모델 성능**이 아니다

보안 시스템의 가치는 오직 **"얼마나 정확하게 탐지하고, 얼마나 적게 오탐하는가"**로 결정된다. 이 숫자 없이 289페이지는 **"좋은 설계의 약속"**에 불과하다.

**최소한 필요한 것:**
```
| 공격 유형     | Precision | Recall | F1    | 데이터셋 |
|-------------|-----------|--------|-------|---------|
| DDoS        | 0.xx      | 0.xx   | 0.xx  | CIC-IDS2017 |
| Botnet      | 0.xx      | 0.xx   | 0.xx  | CTU-13  |
| Unknown     | -         | 0.xx   | -     | custom  |
| Overall FPR | 0.xx%     |        |       | prod    |
```

---

### ❌ 4-2. AE 임계값 하드코딩 (50.0) — 환경 의존적

```python
untrained = reconstruction_error > ae_consensus_max_error  # 기본 50.0
```

문서 자체에서 인정: "AE threshold ~0.047 기준, error > 50은 threshold의 1,000배 이상."

**문제:** 다른 환경에서 AE threshold가 0.5라면 50.0은 100배밖에 안 되고, threshold가 0.001이라면 50,000배다. 같은 "50.0"이 환경에 따라 **완전히 다른 의미**를 가진다.

문서의 개선 로드맵에 "AE z-score 전환"이 있지만 아직 미구현. **이것은 즉시 수정 가능하다:**

```python
ae_consensus_max_error = ae_threshold * config.get("ae_consensus_multiplier", 1000.0)
```

---

### ❌ 4-3. POST body 탐지 불가 — 구조적 한계 (문서가 인정)

Suricata의 `http` 이벤트가 body를 포함하지 않는 구조적 한계:

| 공격 유형 | 탐지 가능? | 이유 |
|---------|----------|------|
| GET 기반 XSS (`/search?q=<script>`) | ✅ | URL에 노출 |
| GET 기반 SQLi (`/login?id=1' OR 1=1`) | ✅ | URL에 노출 |
| POST 기반 XSS/SQLi (body에 페이로드) | ❌ | body 접근 불가 |
| 파일 업로드 공격 | ❌ | body 접근 불가 |
| API 인젝션 (JSON body) | ❌ | body 접근 불가 |

이 한계를 문서에서 솔직하게 인정하고 표까지 만든 것은 좋지만, **현대 웹 공격의 절반 이상이 POST body**라는 점에서 이는 체계적인 탐지 공백이다. WAF 연동 로드맵이 필요하다.

---

### ❌ 4-4. 내부 AND 합의의 이중성

```python
if is_internal and internal_require_both:
    has_consensus = ae_vote AND if_vote    # 엄격
```

**의도**: 내부 트래픽 오탐 → 업무 마비 → 더 엄격하게

**문제**: APT, 랜섬웨어 lateral movement, 내부자 위협은 **정상 포트, 정상 프로토콜**을 사용한다. AE가 정상으로 볼 가능성이 높고, IF도 이상치로 인식하기 어렵다. AND 조건은 이런 공격을 **구조적으로 놓친다**.

문서의 DETECTION_LOGIC에서 "오탐이 미탐보다 위험하다"는 논리를 일관되게 적용했지만, 내부에서 시작된 공격은 **오탐보다 미탐의 비용이 훨씬 크다** (데이터 유출, 랜섬웨어 확산).

**제안**: 내부 트래픽에도 비정상 포트(4444, 1234 등) 연결은 OR 합의로 예외 처리.

---

### ❌ 4-5. 모델 드리프트 감지 메커니즘 없음

자가 학습(Benign 자동 수집)은 구현되었지만, **학습이 모델을 개선하고 있는지 저하시키고 있는지 판단하는 메커니즘이 없다.**

야간 재학습에서 3중 검증(파일 무결성, 클래스별 정확도, AE threshold)을 수행하지만, 이는 **이진 판단**(통과/실패)이지 **추세 모니터링**이 아니다.

필요한 것:
- 시간별 FPR 추세 모니터링
- 탐지율 급감 알림
- 자동 모델 롤백 트리거

---

### ❌ 4-6. StandardScaler 데이터 누수 (문서가 인정)

문서 v2.3의 "설계 결정 보류 사항"에서 스스로 인정:

> `xgboost_classifier.py:79 — 전체 데이터에 fit_transform 후 train_test_split`
> "검증 정확도가 약간 낙관적. 별도 PR로 fit은 train에만 적용하도록 분리 권장"

이는 **모든 ML 교과서에서 경고하는 기본적인 실수**다. 검증 데이터가 스케일러 통계에 이미 반영되어 있으므로, 보고된 검증 정확도는 실제보다 높다. 학습 파이프라인의 신뢰성을 해친다.

---

### ❌ 4-7. 설정 파일(config.yaml) HMAC 미보호

모델 파일은 HMAC-SHA256으로 보호하지만, `config.yaml`은 보호하지 않는다. 공격자가 config를 수정하면:

- `xgboost_only_threshold: 0.99` → 거의 모든 공격 통과
- `ae_consensus_max_error: 0.1` → 정상 트래픽 전부 차단
- `require_consensus: false` → 합의 메커니즘 무력화
- `tier1_skip`에 공격 IP 추가 → 탐지 우회

문서 자체에서 "Low 우선순위"로 분류했지만, 이는 **모델 파일 변조와 동등한 위험**이다.

---

### ❌ 4-8. HDBSCAN 클러스터링 지연 + O(n²) 문제

- **지연**: 100개 이상 Unknown_Attack이 쌓여야 실행 → 그 전까지 모두 동일 라벨
- **성능**: HDBSCAN은 O(n·log n) ~ O(n²) → 5,000개 버퍼에서 느려질 수 있음
- **쿨다운**: 15차 최적화로 5분 + 50샘플 조건 추가 → 빈번 실행 방지

5분 쿨다운은 성능 문제를 완화하지만, **같은 날 발생한 서로 다른 제로데이 공격들이 구분되지 않는 기간**이 존재한다.

---

### ❌ 4-9. 3개 Path 간 division-by-zero 처리 불일치

문서 v2.3의 보류 사항:

| Path | duration=0 처리 |
|------|----------------|
| Path A (feature_extractor) | `_safe_divide` → 0 반환 |
| Path B (_compute_derived_features) | `dur_valid` 마스크로 rate=0 |
| Path C (_aggregate_flows) | `* 1_000_000` 변환 후 clip |

학습(Path B/C)과 추론(Path A)에서 **같은 상황에 다른 값**이 나오면 도메인 불일치가 발생한다. 이는 30→59 피처 확장 시 여러 경로가 독립적으로 발전하면서 생긴 문제로, 기술 부채다.

---

### ❌ 4-10. Benign 자동 수집의 Poisoning 취약점

문서가 인정한 한계:

```
XGBoost < 0.15 → AE 체크 스킵 → 새 패턴 수집
```

C2 비콘이 **정상 트래픽 패턴을 모방하면서 XGBoost 점수 < 0.15를 달성**할 수 있다 (예: HTTPS 443 포트, 정상적인 패킷 크기, 주기적이지 않은 통신). 이 경우 악성 트래픽이 Benign으로 학습 데이터에 유입된다.

3일 격리 + 재검증이 있지만, **격리 기간 동안 공격이 지속되면 재검증 시에도 XGBoost가 같은 판단**을 내릴 가능성이 높다.

---

### ❌ 4-11. 악성 트래픽 자동 학습 불가 — 피드백 루프 부재

```
[정상] 자동 수집 → 자동 재학습    ← 구현 완료
[악성] 탐지 → 차단 + 로깅만      ← GAP
[미확인] Unknown → 버퍼 → 수동 분류 ← 반자동
```

`classify_unknown.sh`가 반자동 워크플로우를 제공하지만, **확인된 위협이 자동으로 학습에 반영되는 루프는 없다**. 시간이 지나면 XGBoost는 처음 학습한 공격 패턴에 머물고, 새로운 공격 변형에 대한 적응이 수동 운영에 의존한다.

---

### ❌ 4-12. 데이터셋 편향 문제

학습에 사용한 25개 데이터셋(CIC-IDS2017/2018, UNSW-NB15, CTU-13 등)은 대부분 **실험실 생성 데이터**다:

- 공격 패턴이 과도하게 명확 (실제 환경의 노이즈 없음)
- 최신 공격 기법(2024~2026) 미반영
- IP/포트 분포가 실제 네트워크와 다름

MAWI + 자체 수집으로 Benign 편향은 완화하지만, **악성 트래픽의 현실성 갭**은 여전하다.

---

### ❌ 4-13. 단일 서버 확장성 한계

```
단일 서버에서:
  Suricata(Docker) + 메인 프로세스 + GPU 추론서버 + 데이터 파이프라인 + 재학습
```

Token Bucket 1,000/sec으로 Rate Limit하고 Deferred Analysis로 초과분을 디스크 큐에 저장하지만, 10Gbps+ 환경에서는 구조적으로 부족하다. Kafka/Flink 기반 분산 처리나 센서-분석 분리 아키텍처가 없다.

---

### ⚠️ 4-14. 라벨 매핑 수동 관리 위험

289개 LABEL_MAPPING + 26개 FOLDER_LABEL_MAP을 `constants.py` 한 곳에서 관리하는 것은 좋지만, **수동 관리의 근본적 위험**은 버그 이력이 증명한다:

- FTP-Patator → PortScan (실제는 BruteForce) — #61
- benign/stratosphere → Botnet 오분류 — #64 (CRITICAL)
- CC LABEL_MAPPING 누락 → Suspicious 전락 — #63

매핑이 늘어날수록 실수 가능성이 선형 증가한다.

---

### ⚠️ 4-15. 암호화 트래픽 한계

TLS 1.3 일반화로 대부분의 C2 통신이 암호화되어 있다. 시스템은 TLS 핸드셰이크(SNI, 버전)는 분석하지만 **내용은 볼 수 없다**. 트래픽 메타데이터(크기, 속도, 패킷 수)에 의존하는데, 공격자가 트래픽 셰이핑으로 정상 패턴을 모방하면 탐지를 피할 수 있다.

다만 `tls_sni_length`, `tls_version_num`, `dns_query_entropy` 등 26개 페이로드 피처로 부분적인 분석은 가능하다.

---

## 5. 로직 가능성 검토

### 5-1. 핵심 질문: "이 로직이 가능한가?"

**YES — 모든 개별 컴포넌트는 검증된 기술이고, 조합도 이론적으로 일관된다.**

| 컴포넌트 | 기술 | 산업/학계 검증 |
|---------|------|-------------|
| IDS 엔진 | Suricata | OISF 오픈소스 표준 |
| 이상 탐지 | Keras AE (30→128→64→32→64→128→30) | 학계 광범위 사용 |
| 분류기 | XGBoost (100 trees, multi:softprob) | 산업 표준 |
| 이상치 | sklearn IsolationForest (n=200, c=0.01) | 학계 검증 |
| 클러스터링 | HDBSCAN (min_cluster=15) | 학계 검증 |
| 원자적 I/O | tempfile + os.replace + fsync | OS 보장 |
| 무결성 | HMAC-SHA256 | 암호학 표준 |
| 스케일러 | Welford's Online Algorithm | 수학적 정확 |

### 5-2. 시나리오별 판단

| 시나리오 | 판단 | 근거 |
|---------|------|------|
| 소규모 기업 (< 1Gbps) | ✅ 동작 가능 | Rate Limit 1,000/sec 충분, GPU 1개로 실시간 처리 |
| 중규모 데이터센터 (1~10Gbps) | ⚠️ 튜닝 필요 | Rate Limit 상향, Deferred Analysis 디스크 용량 확보 |
| 대규모 통신사 (> 10Gbps) | ❌ 재설계 필요 | 단일 서버 한계, 분산 아키텍처 필수 |
| 알려진 공격 탐지 | ✅ 높을 것으로 예상 | XGBoost 1.4억 샘플 학습, 다만 **실측 미검증** |
| 제로데이 탐지 | ⚠️ 제한적 | AE+IF "이상하다"는 감지 가능, 유형 분류 불가 |
| POST body 공격 | ❌ 구조적 불가 | Suricata http 이벤트 한계, WAF 필요 |
| 암호화 트래픽 내부 공격 | ❌ 메타데이터 한계 | TLS 내용 복호 불가, 패턴 모방 우회 가능 |
| 내부 Lateral Movement | ⚠️ AND 합의로 미탐 위험 | 정상 포트/프로토콜 사용 시 AE+IF 둘 다 정상 판정 가능 |

### 5-3. 합의 로직의 수학적 일관성

```python
untrained = is_anomaly and error > max_error
ae_vote = is_anomaly and not untrained
if_vote = if_anomaly and not untrained

# 내부: AND, 외부: OR
has_consensus = (ae_vote AND if_vote) if internal else (ae_vote OR if_vote)

# XGBoost 단독 차단 조건
if require_consensus and not has_consensus:
    skip_xgb_only = True
```

이 로직은 **논리적으로 모순이 없고**, 특히 "미학습 패턴 → 투표 제외 → 합의 불성립 → XGBoost 단독 불가"라는 체인이 **의도한 대로 동작**한다.

단, `ae_consensus_max_error = 50.0`의 **환경 독립성**이 유일한 논리적 약점이다.

---

## 6. 이전 리뷰(Sonnet)와의 차이

이전 Sonnet 4.6 리뷰에서 발견하지 못했거나 충분히 다루지 못한 부분:

| 항목 | Sonnet 리뷰 | Opus 재검토 |
|------|------------|-----------|
| GPU 추론서버 | 간략 언급 | ✅ 가장 인상적인 엔지니어링으로 재평가 |
| 5층 Benign 보호 | 미발견 | ✅ 새로 발견, 높이 평가 |
| 야간 자동 재학습 | 미발견 | ✅ 새로 발견, 무중단 교체 메커니즘 분석 |
| classify_unknown.sh | 미발견 | ✅ 반자동 워크플로우 평가 |
| StandardScaler 데이터 누수 | 미발견 | ✅ 문서 자체의 보류 사항에서 발견 |
| 3 Path 불일치 | 미발견 | ✅ duration 단위, division-by-zero 차이 |
| AE Fallback 로직 | 미발견 | ✅ AE 장애 시 XGB 0.8/0.9 보완 |
| 차단/관찰 분리 | 미발견 | ✅ 11차 로직 수정의 핵심 |
| DETECTION_LOGIC 철학 | 미발견 | ✅ NIST/Gartner/호주Census 근거 평가 |
| 데이터 수집 포괄성 | 간략 언급 | ✅ MAWI 파이프라인, MTA 크롤링 상세 분석 |

**Sonnet 리뷰 점수 7.0 → Opus 재평가: 7.5**

차이의 이유: Sonnet이 발견하지 못한 운영 도구(야간 재학습, classify_unknown, convert_pcap 등)와 설계 철학(5층 방어, 차단/관찰 분리)이 시스템의 완성도를 상당히 높인다. 하지만 실측 성능 데이터 부재라는 근본적 결함이 여전하므로 0.5점만 상향.

---

## 7. 핵심 개선 제안

### 🔴 Priority 1 — 즉시 (1주 이내)

**1. 성능 벤치마크 수행 및 문서화**

이것이 유일하게 "반드시" 해야 할 일이다. 나머지는 다 후순위.

```python
# 최소 검증 시나리오
from sklearn.metrics import classification_report

# 1. 알려진 공격 (held-out test set)
y_pred = ensemble.predict(X_test)
print(classification_report(y_test, y_pred))

# 2. 오탐율 (실제 운영 데이터)
benign_preds = ensemble.predict(X_prod_benign_24h)
fpr = (benign_preds != 'Benign').sum() / len(benign_preds)
print(f"24시간 FPR: {fpr:.4%}")

# 3. 제로데이 (학습에 포함하지 않은 공격)
ae_recall = (ae_anomaly[y_novel == 'Attack']).mean()
print(f"AE 제로데이 recall: {ae_recall:.2%}")
```

**2. AE 임계값 동적 계산**

```yaml
# 변경 전
ae_consensus_max_error: 50.0

# 변경 후
ae_consensus_multiplier: 1000.0  # ae_threshold × 이 값으로 자동 계산
```

**3. config.yaml HMAC 보호**

```python
config_hash = compute_file_hash('config/config.yaml', use_hmac=True)
# startup 시 검증, 불일치 시 경고 또는 거부
```

---

### 🟡 Priority 2 — 1개월 이내

**4. 모델 드리프트 모니터링**

```python
class DriftMonitor:
    def hourly_check(self):
        recent_fpr = self.calc_fpr(hours=24)
        if recent_fpr > self.baseline_fpr * 2:
            alert("FPR 2배 증가, 모델 점검 필요")
        if self.threat_rate < self.baseline_threat_rate * 0.5:
            alert("탐지율 절반 감소, 데이터 드리프트 의심")
```

**5. 내부 트래픽 탐지 전략 재검토**

```yaml
detection:
  ensemble:
    internal_require_both: true       # 기본: AND
    # 예외: 의심 포트 접근은 OR 허용
    internal_or_exception_ports: [4444, 5555, 1234, 8888, 31337]
    # 예외: 비정상 시간대(새벽)는 OR 허용
    internal_or_exception_hours: [0, 1, 2, 3, 4, 5]
```

**6. StandardScaler 데이터 누수 수정**

```python
# 변경 전
X_scaled = scaler.fit_transform(X_all)
X_train, X_val = train_test_split(X_scaled)

# 변경 후
X_train_raw, X_val_raw = train_test_split(X_all)
scaler.fit(X_train_raw)
X_train = scaler.transform(X_train_raw)
X_val = scaler.transform(X_val_raw)
```

---

### 🟢 Priority 3 — 3개월 이내

**7. 분산 처리 아키텍처 로드맵**

```
다중 센서 (Suricata × N)
    → Kafka Topic
    → Flink/Spark (피처 추출 + 배치)
    → 추론 클러스터 (GPU × N)
    → 결과 집계 → 판정
```

**8. WAF 연동 (POST body 탐지 보완)**

```
Suricata (네트워크 메타데이터) + ModSecurity/AWS WAF (HTTP body)
    → 결합 판정
```

**9. 3 Path division-by-zero 통일**

```python
# 모든 경로에서 동일한 함수 사용
def safe_rate(value, duration_us):
    """duration이 0이면 rate=0 반환. 모든 경로에서 사용."""
    if duration_us <= 0:
        return 0.0
    return value / (duration_us / 1_000_000)
```

---

## 8. 종합 점수 및 결론

### 영역별 평가

| 영역 | 점수 | 이유 |
|------|------|------|
| **아키텍처 설계** | 8.5/10 | GPU 추론서버 분리 + 앙상블 합의 + 자가 학습. 확장성만 부족 |
| **보안** | 8/10 | v1.2.3~v1.2.5로 대폭 강화. config 보호만 미흡 |
| **ML 로직** | 7/10 | 합의 메커니즘 독창적, 5층 Benign 보호 우수. 실측 검증 없음 |
| **코드 품질** | 8/10 | 67건 버그 체계적 수정, 126개 테스트, 원자적 I/O |
| **운영 도구** | 9/10 | 야간 재학습, 백업/복원, 배포, classify_unknown, 대화형 메뉴 |
| **데이터 파이프라인** | 8.5/10 | 25개 데이터셋, MAWI+MTA 자동 수집, 151M+ 샘플, OOM 처리 |
| **성능 검증** | 2/10 | 실측 수치 전무 — **가장 치명적 약점** |
| **확장성** | 4/10 | 단일 서버 + Rate Limit |
| **문서화** | 9.5/10 | 289페이지, 교육 자료, 운영 가이드, 설계 철학까지 |

### 전체 평가: **7.5 / 10**

(Sonnet 리뷰 7.0에서 0.5 상향)

---

### 이 로직이 "가능한가?"

**단기적으로 YES. 장기적으로 조건부 YES.**

이 시스템은 **"학술 프로토타입"이 아니라 "실제 운영 시스템"**이다. 67건의 버그 수정, 15차에 걸친 로직 개선, GPU 추론서버 분리, 야간 무중단 재학습 — 이 모든 것이 **프로덕션에서 부딪힌 문제를 해결한 결과물**이다.

그러나 **"잘 설계되었다"와 "잘 작동한다"는 별개**이고, 이 문서는 전자만 증명한다. 다음 단계는 명확하다:

> **통제된 환경에서 공격 유형별 탐지율과 오탐율을 측정하고, 그 결과를 이 문서에 추가하라.**
> **그것이 이 시스템의 가치를 증명하는 유일한 방법이다.**

---

### 최종 의견

이 시스템의 개발자(들)는 다음을 잘 이해하고 있다:
- 보안 시스템에서 오탐이 미탐보다 위험한 이유
- Python GIL의 한계와 프로세스 수준 우회
- pickle RCE의 현실적 위협
- 증분 학습 시 scaler 드리프트의 수학적 해결
- TOCTOU 레이스 조건의 근본 원인

이 수준의 이해를 가진 개발팀이 성능 벤치마크를 수행하면, 이 시스템은 **소규모~중규모 네트워크에서 실용적인 위협 탐지 도구**가 될 수 있다.

---

*이 문서는 2026-03-26 기준 ThreatDetection_Docs_2026-03-26 (1).pdf (289p, 508KB 텍스트)를 Claude Opus 4.6이 전체 분석하여 작성했습니다.*
