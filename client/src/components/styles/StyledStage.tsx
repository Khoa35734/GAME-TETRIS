import styled from "styled-components";

type Props = {
  height: number;
  width: number;
  showGhost?: boolean;
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
  border-top: 0;
  width: var(--boardW);
  max-width: var(--boardW);
  
  /* =================================== */
  /* START: SỬA LỖI LƯỚI (Grid)          */
  /* =================================== */
  
  /* Thay vì trong suốt, chúng ta đặt màu nền 
     là màu xám nhạt. Màu này sẽ lấp đầy 'grid-gap: 1px'
     và tạo ra đường lưới rõ ràng. */
  background: rgba(255, 255, 255, 0.25);
  
  /* =================================== */
  /* END: SỬA LỖI                         */
  /* =================================== */

  overflow: visible;

  /* Bottom border - subtle transparent style */
  box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.1);

  /* Side borders - transparent style */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    pointer-events: none;
    box-shadow: inset 2px 0 0 rgba(255, 255, 255, 0.1), inset -2px 0 0 rgba(255, 255, 255, 0.1);
  }

  /* Hide ghost pieces if showGhost is false */
  ${(props) => !props.showGhost && `
    /* Target ghost cells by their type attribute or CSS */
    div[data-ghost="true"] {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `}
`;