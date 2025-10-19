import { FormEvent, useState } from 'react';
import styled from 'styled-components';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
};

const Wrapper = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, rgba(30, 92, 255, 0.15), transparent 60%), #03060f;
`;

const Card = styled.div`
  width: min(420px, 92vw);
  padding: 40px;
  background: rgba(18, 22, 40, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #e3ebff;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.4);
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  margin: 0 0 28px;
  color: rgba(227, 235, 255, 0.64);
  letter-spacing: 0.08em;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(11, 14, 24, 0.9);
  color: #fff;
  font-size: 15px;
  margin-bottom: 16px;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #1e5cff 0%, #6a8bff 100%);
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Error = styled.p`
  margin: 0 0 12px;
  color: #ff6b6b;
  font-size: 14px;
`;

const LoginPage = ({ onLogin }: Props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <Card>
        <Title>D.TETRIS LOGIN</Title>
        <Subtitle>ENTER YOUR CREDENTIALS TO START STACKING</Subtitle>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
            required
          />
          <Input
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
          />
          {error && <Error>{error}</Error>}
          <SubmitButton type="submit" disabled={loading}>
            {loading ? 'LOGGING IN…' : 'LOG IN'}
          </SubmitButton>
        </form>
      </Card>
    </Wrapper>
  );
};

export default LoginPage;
