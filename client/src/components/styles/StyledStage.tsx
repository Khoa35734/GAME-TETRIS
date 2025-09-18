import styled from "styled-components";

type Props = {
  height: number;
  width: number;
};

export const StyledStage = styled.div<Props>`
  --boardW: clamp(340px, 20vw, 480px);
  --cell: calc(var(--boardW) / ${(props) => props.width});
  display: grid;
  grid-template-rows: repeat(
    ${(props) => props.height},
    calc(var(--boardW) / ${(props) => props.width})
  );
  grid-template-columns: repeat(${(props) => props.width}, 1fr);
  grid-gap: 1px;
  position: relative;
  border: none;
  border-top: 0; /* Xoá viền ngoài phía trên để 3 hàng đầu hoà vào background */
  width: var(--boardW);
  max-width: var(--boardW);
  /* Top 3 rows: transparent to show page background; below: dark board background */
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0) 0,
    rgba(0,0,0,0) calc(var(--cell) * 3 + 2px),
    #111 calc(var(--cell) * 3 + 2px),
    #111 100%
  );
  overflow: visible; /* cho phép nhìn thấy các ô spawn ngoài vùng cũ nếu cần */

  /* Bottom border full width */
  box-shadow: inset 0 -2px 0 #333;

  /* Side borders start below top-3 rows */
  &::after {
    content: "";
    position: absolute;
    top: calc(var(--cell) * 3 + 2px);
    left: 0;
    height: calc(100% - (var(--cell) * 3 + 2px));
    width: 100%;
    pointer-events: none;
    box-shadow: inset 2px 0 0 #333, inset -2px 0 0 #333;
  }
`;