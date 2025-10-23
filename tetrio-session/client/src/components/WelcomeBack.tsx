import styled from "styled-components";

type Props = {
  username: string;
  onJoin: () => void;
  onLogout: () => void;
};

const Wrapper = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #000;
`;

const Card = styled.div`
  width: min(500px, 94vw);
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(180deg, #f5f5f5 0%, #ececec 100%);
  border: 1px solid rgba(0, 0, 0, 0.4);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
`;

const Content = styled.div`
  padding: 36px 40px 28px;
  text-align: left;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 26px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0f0f0f;
`;

const Subtitle = styled.p`
  margin: 10px 0 26px;
  letter-spacing: 0.35em;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.55);
`;

const Username = styled.div`
  font-family: "Share Tech Mono", "Fira Mono", monospace;
  font-size: 30px;
  letter-spacing: 0.25em;
  font-weight: 700;
  color: #161616;
`;

const ButtonBar = styled.div`
  display: flex;
  background: #cfcfcf;
  border-top: 1px solid rgba(0, 0, 0, 0.35);
`;

const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  flex: 1;
  padding: 18px 0;
  border: none;
  background: ${({ $variant }) => ($variant === "primary" ? "#1E5CFF" : "#bdbdbd")};
  color: ${({ $variant }) => ($variant === "primary" ? "#ffffff" : "#1a1a1a")};
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:first-child {
    border-right: 1px solid rgba(0, 0, 0, 0.35);
  }

  &:hover {
    filter: brightness(0.95);
  }
`;

const WelcomeBack = ({ username, onJoin, onLogout }: Props) => (
  <Wrapper>
    <Card>
      <Content>
        <Title>WELCOME BACK TO TETR.IO!</Title>
        <Subtitle>IS THIS YOU?</Subtitle>
        <Username>{username}</Username>
      </Content>
      <ButtonBar>
        <ActionButton $variant="secondary" onClick={onLogout}>
          LOG OUT
        </ActionButton>
        <ActionButton $variant="primary" onClick={onJoin}>
          JOIN
        </ActionButton>
      </ButtonBar>
    </Card>
  </Wrapper>
);

export default WelcomeBack;
