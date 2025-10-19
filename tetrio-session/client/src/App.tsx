import { StrictMode, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import WelcomeBack from './components/WelcomeBack';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #000;
    color: #fff;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  }
`;

type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; username: string; loggedIn: boolean };

const Home = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 20%, rgba(30, 92, 255, 0.28), transparent 60%), #02040a;
  h1 {
    font-size: 2.5rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  p {
    color: rgba(230, 236, 255, 0.7);
  }
`;

const Shell = () => {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    fetch('/auth/session', { credentials: 'include', signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.loggedIn) {
          setAuth({ status: 'ready', username: payload.username, loggedIn: true });
        } else {
          setAuth({ status: 'ready', username: 'GUEST', loggedIn: false });
        }
      })
      .catch(() => setAuth({ status: 'ready', username: 'GUEST', loggedIn: false }));

    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    setAuth({ status: 'ready', username: 'GUEST', loggedIn: false });
    navigate('/');
  };

  const handleJoin = () => {
    navigate('/home');
  };

  if (auth.status === 'loading') {
    return <div style={{ textAlign: 'center', paddingTop: '30vh' }}>Loading…</div>;
  }

  return (
    <>
      <GlobalStyle />
      <Routes>
        <Route
          path="/"
          element={
            <WelcomeBack
              username={auth.username}
              onJoin={handleJoin}
              onLogout={auth.loggedIn ? handleLogout : () => navigate('/home')}
            />
          }
        />
        <Route
          path="/home"
          element={
            <Home>
              <div>
                <h1>Welcome to D.TETRIS</h1>
                <p>{auth.loggedIn ? `Logged in as ${auth.username}` : 'Guest session active'}</p>
              </div>
            </Home>
          }
        />
      </Routes>
    </>
  );
};

const App = () => (
  <StrictMode>
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  </StrictMode>
);

export default App;
