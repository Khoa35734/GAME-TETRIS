import React from "react";
import { StyledStartButton } from "./styles/StyledStartButton";

type Props = {
  callback: () => void;
}

const StartButton: React.FC<Props> = ({ callback }) => (
  <StyledStartButton
    type="button"
    tabIndex={-1}        // 🚫 không cho nút này bị focus → Space không kích hoạt
    onClick={callback}
    onKeyDown={(e) => {  // 🚫 nếu lỡ focus, chặn Space luôn

      if (e.code === "Space" || e.key === " " || e.keyCode === 32) {
        e.preventDefault();
        e.stopPropagation();
      }
    }}
  >
    Start Game
  </StyledStartButton>
);

export default StartButton;
