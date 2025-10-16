import { useDispatch, useSelector } from "react-redux";
import styled from "@emotion/styled";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { SunIcon, MoonIcon, Pencil1Icon, EyeOpenIcon } from "@radix-ui/react-icons";
import { toggleTheme, selectTheme, toggleEditing, togglePreviewing, selectIsEditing, selectIsPreviewing } from "../store/slices/globalSlice";
import { colors, spacing, zIndices } from "../styles/tokens";

const StyledToolbar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: ${colors.background.panel};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: ${zIndices.toolbar};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${spacing.md} 0 78px;
  user-select: none;
`;

const ToolbarSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
  height: 100%;
  padding-right: ${(props) => (props.$isRight ? "4px" : "0")};
  flex: ${(props) => (props.$isCenter ? 1 : "unset")};
  justify-content: ${(props) => (props.$isCenter ? "center" : "flex-start")};
`;

const ThemeToggle = styled(IconButton)`
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

export function Toolbar() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const isEditing = useSelector(selectIsEditing);
  const isPreviewing = useSelector(selectIsPreviewing);

  return (
    <StyledToolbar>
      <ToolbarSection data-tauri-drag-region>
        <Tooltip content="Edit">
          <IconButton
            size={1}
            variant={isEditing ? "solid" : "soft"}
            onClick={() => dispatch(toggleEditing())}
          >
            <Pencil1Icon />
          </IconButton>
        </Tooltip>
        <Tooltip content="Preview">
          <IconButton
            size={1}
            variant={isPreviewing ? "solid" : "soft"}
            onClick={() => dispatch(togglePreviewing())}
          >
            <EyeOpenIcon />
          </IconButton>
        </Tooltip>
      </ToolbarSection>
      <ToolbarSection $isCenter data-tauri-drag-region />
      <ToolbarSection $isRight>
        <ThemeToggle size="1" variant="ghost" onClick={() => dispatch(toggleTheme())}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </ThemeToggle>
      </ToolbarSection>
    </StyledToolbar>
  );
}
