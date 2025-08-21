import React from "react";
import { StyledDisplay } from "./styles/StyledDisplay";

interface DisplayProps {
  gameOver?: boolean;
  text: string;
}

const Display: React.FC<DisplayProps> = ({ gameOver = false, text }) => (
  <StyledDisplay gameOver={gameOver}>{text}</StyledDisplay>
);

export default Display;
