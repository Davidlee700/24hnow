export default function Home() {
  return (
    <>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          현재 위치 주변 <br/>
          <span className="text-neon">진짜 24시</span> 매장
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          사용자 제보와 데이터 검증을 통해 믿을 수 있는 정보만 제공합니다.
        </p>
      </section>

      {/* Mock Store Card to show Liquid Glass UI */}
      <article className="liquid-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>할리스커피 신촌점</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              카페
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--accent-neon-green)', borderRadius: '50%', marginRight: '6px', boxShadow: '0 0 8px var(--accent-neon-green)' }}></span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-neon-green)' }}>운영 중</span>
          </div>
        </div>
        
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          서울 서대문구 연세로 34
        </p>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', backgroundColor: 'rgba(173, 255, 47, 0.1)', border: '1px solid rgba(173, 255, 47, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            ✓ 3일 전 확인됨
          </span>
          <button style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer' }}>
            제보하기
          </button>
        </div>
      </article>

      <article className="liquid-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>GS25 홍대중앙점</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              편의점
            </span>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.7 }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--text-secondary)', borderRadius: '50%', marginRight: '6px' }}></span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>확인 필요</span>
          </div>
        </div>
        
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          서울 마포구 홍익로 10
        </p>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            ? 45일 전 확인됨
          </span>
          <button style={{ background: 'var(--accent-neon-green)', border: 'none', color: '#000', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
            제보하기
          </button>
        </div>
      </article>
    </>
  );
}
