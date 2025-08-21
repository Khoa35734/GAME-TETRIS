import styled from "styled-components";

// Giả sử bạn có ảnh này trong cấu trúc thư mục của mình
import bgImage from "../../../img/bg.jpg";

export const StyledTetrisWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  background: url(${bgImage}) #000;
  background-size: cover;
  overflow: hidden;
`;

export const StyledTetris = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 40px;
  margin: 0 auto;
  max-width: 900px;

  aside {
    width: 100%;
    max-width: 200px;
    display: block;
    padding: 0 20px;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 15px;
    margin-left: 20px;
    box-shadow: 
      0 4px 30px rgba(0, 0, 0, 0.1),
      inset 0 0 20px rgba(255, 255, 255, 0.05);
  }
`;