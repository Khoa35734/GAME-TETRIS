import styled from "styled-components";

export const StyledStartButton = styled.button`
  box-sizing: border-box;
  margin: 0 0 20px 0;
  padding: 20px;
  min-height: 30px;
  width: 100%;
  border-radius: 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: Pixel, Arial, Helvetica, sans-serif;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 10px rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 25px rgba(0, 0, 0, 0.2),
      inset 0 1px 15px rgba(255, 255, 255, 0.2);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 10px rgba(0, 0, 0, 0.15),
      inset 0 1px 5px rgba(255, 255, 255, 0.1);
  }
`;