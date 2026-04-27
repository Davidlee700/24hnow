# 서비스 개발 절대 규칙 (Absolute Rules for Service Development)

이 규칙은 별도의 수정 요청이 있기 전까지 항상 지켜져야 하는 최우선 원칙입니다.

## 1. 배포의 절대권한 (Deployment Sovereignty)
- **규칙**: 모든 코드는 작성 후 '검토' 단계에서 멈춘다.
- **지침**: 배포(Production Push)는 반드시 사용자의 명시적인 승인(**"배포해줘"**, **"Push"**)이 있을 때만 실행한다.

## 2. 애플의 영혼 투사 (The Apple Soul)
- **규칙**: 디자인, 문구(Writing), 인터랙션의 모든 단계에서 **Apple HIG(Human Interface Guidelines)**를 최우선으로 한다.
- **세부 지침**:
  - **Writing**: 기계적인 메시지를 금지하고, 사용자에게 정중하며(Respectful), 간결하고(Concise), 도움이 되는(Helpful) 애플식 한국어 페르소나를 유지한다.
  - **Visual**: 모든 요소는 '유리(Glassmorphism)'와 '계층(Layering)'의 논리를 따르며, 여백(Margin/Padding)은 4의 배수를 사용하여 엄격한 질서를 유지한다.

## 3. 무결한 로직과 모듈화 (Modular Excellence)
- **규칙**: 한 파일에 코드를 쏟아붓지 마라. 기능별로 엄격히 컴포넌트를 분리(Atomic Design)하고, 중복 코드를 극도로 경계한다.
- **이유**: AI는 코드가 길어지면 앞의 맥락을 잊습니다. 잘게 쪼개야 장기적으로 유지보수가 가능합니다.

## 4. 시각적 햅틱과 물리 법칙 (Physical Interaction)
- **규칙**: 모든 클릭과 전환(Transition)에는 물리적인 무게감과 탄성(Elasticity)이 느껴지는 애니메이션을 포함한다.
- **지침**: 모바일 웹의 한계를 극복하기 위해 Scale, Opacity, Blur를 활용한 시각적 피드백을 0.1초 단위로 정교하게 설계한다.

## 5. 데이터의 보수적 접근 (Data Integrity)
- **규칙**: 불확실한 정보는 절대 확정적으로 노출하지 않는다.
- **지침**: 데이터의 신뢰도가 낮으면 "정보 확인 중" 또는 "최근 정보 없음"과 같은 상태를 명시하고, AI 마음대로 가짜 데이터를 생성(Hallucination)하는 것을 엄격히 금지한다.
