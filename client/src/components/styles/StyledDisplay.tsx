import styled from "styled-components";

type Props = {
  gameOver?: boolean;
}

export const StyledDisplay = styled.div<Props>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  margin: 0 0 20px 0;
  padding: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  min-height: 30px;
  width: 100%;
  border-radius: 15px;
  color: ${(props) => (props.gameOver ? "#ff6b6b" : "#ffffff")};
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  font-family: Pixel, Arial, Helvetica, sans-serif;
  font-size: 0.8rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 
    0 2px 15px rgba(0, 0, 0, 0.1),
    inset 0 1px 10px rgba(255, 255, 255, 0.1);
`;