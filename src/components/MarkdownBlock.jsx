import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import styled from "@emotion/styled";
import { Button, Flex, Tooltip, IconButton, DropdownMenu, TextField, Badge } from "@radix-ui/themes";
import { PlayIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon, TextAlignLeftIcon } from "@radix-ui/react-icons";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { keymap, EditorView } from "@codemirror/view";
import { getSectionTypeColor, formatSectionType } from "@/utils/sectionTransform";
import { selectTheme } from "@/store/slices/globalSlice";
import { colors, spacing, radii } from "@styles/tokens";

// Theme-specific background colors for CodeMirror editor
const THEME_COLORS = {
  dark: 'rgb(41, 44, 52)',
  light: 'rgb(250, 250, 250)'
};

// CodeMirror sizing constants
const LINE_HEIGHT_MULTIPLIER = 1.5;
const BASE_FONT_SIZE = 16;

// Styled Components
const BlockContainer = styled.div`
  width: 100%;
  border: 1px solid ${colors.border.default};
  border-radius: ${radii.lg};
  overflow: hidden;
  margin: ${spacing.xxl} 0 ${spacing.lg} 0;
  background-color: ${colors.background.elevated};
  flex-shrink: 0;
`;

const EditorWrapper = styled.div`
  position: relative;
  min-height: ${props => `${props.$minLines * LINE_HEIGHT_MULTIPLIER}em`};
  height: ${props => props.$height || 'auto'};

  /* Ultra-thin slick scrollbars for CodeMirror */
  .cm-scroller::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }

  .cm-scroller::-webkit-scrollbar-track {
    background: transparent;
  }

  .cm-scroller::-webkit-scrollbar-thumb {
    background: var(--gray-7);
    border-radius: 2px;

    &:hover {
      background: var(--accent-9);
    }
  }
`;

const ResizeHandle = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  cursor: ns-resize;
  background-color: ${props => THEME_COLORS[props.$theme]};

  // The actual visible bar (centered within the hit area)
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10rem;
    height: 2px;
    background-color: var(--accent-9);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s ease, background-color 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }

  &:active::after {
    background-color: var(--accent-11);
    opacity: 1;
  }

  ${props => props.$isResizing && `
    &::after {
      background-color: var(--accent-11);
      opacity: 1;
    }
  `}
`;

const ActionButtons = styled(Flex)`
  position: relative;
  z-index: 1;
  padding: ${spacing.sm};
  border-top: 1px solid ${colors.border.default};
  background-color: ${colors.background.elevated};
`;

const BlockHeader = styled(Flex)`
  padding: 8px 12px;
`;

const SectionIdText = styled.span`
  font-size: 12px;
  color: var(--gray-10);
  font-family: monospace;
`;

// Component
export function MarkdownBlock({
  id,
  content,
  onContentChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onNavigateToPrevious,
  onNavigateToNext,
  isFirst,
  isLast,
  sectionType,
  sectionId,
  minLines = 2,
  shouldFocus = false,
  focusCursorPosition = null
}) {
  const theme = useSelector(selectTheme);
  const [showCustomAsk, setShowCustomAsk] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [blockHeight, setBlockHeight] = useState('auto');
  const [isResizing, setIsResizing] = useState(false);
  const [isWordWrapEnabled, setIsWordWrapEnabled] = useState(false);
  const codeMirrorViewRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const arrowUpCountRef = useRef(0);
  const arrowDownCountRef = useRef(0);
  const keyResetTimerRef = useRef(null);

  // Effects
  // Set cursor position and focus after navigation
  useEffect(() => {
    if (shouldFocus && focusCursorPosition !== null && codeMirrorViewRef.current) {
      const timeoutId = setTimeout(() => {
        const view = codeMirrorViewRef.current;
        if (!view) return;

        view.dispatch({
          selection: { anchor: focusCursorPosition, head: focusCursorPosition },
          scrollIntoView: true
        });

        view.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldFocus, focusCursorPosition, id]);

  // Helper Functions
  // Reset arrow key press counters
  const resetKeyCounters = () => {
    arrowUpCountRef.current = 0;
    arrowDownCountRef.current = 0;
    if (keyResetTimerRef.current) {
      clearTimeout(keyResetTimerRef.current);
      keyResetTimerRef.current = null;
    }
  };

  // Helper to schedule counter reset
  const scheduleCounterReset = () => {
    if (keyResetTimerRef.current) {
      clearTimeout(keyResetTimerRef.current);
    }
    keyResetTimerRef.current = setTimeout(() => {
      resetKeyCounters();
    }, 500);
  };

  // Event Handlers
  // Handle resize drag interaction
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = editorWrapperRef.current?.offsetHeight || 0;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const minHeight = minLines * LINE_HEIGHT_MULTIPLIER * BASE_FONT_SIZE;

      // Get actual content height from CodeMirror
      const contentHeight = codeMirrorViewRef.current?.contentDOM?.scrollHeight || Infinity;

      // Clamp between min height and content height
      const newHeight = Math.max(minHeight, Math.min(contentHeight, startHeight + deltaY));
      setBlockHeight(`${newHeight}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  };

  const handleReviseAction = (action) => {
    if (action === "custom-ask") {
      setShowCustomAsk(true);
    } else {
      setShowCustomAsk(false);
      console.log("Revise action:", action);
    }
  };

  // CodeMirror Extensions
  // Custom keymap for block navigation
  const customKeymap = useMemo(() => {
    return keymap.of([
      {
        key: "ArrowUp",
        run: (view) => {
          const { from } = view.state.selection.main;

          if (from === 0 && !isFirst && onNavigateToPrevious) {
            arrowUpCountRef.current += 1;
            scheduleCounterReset();

            if (arrowUpCountRef.current >= 2) {
              resetKeyCounters();
              onNavigateToPrevious(id);
              return true;
            }
            return true; // Prevent default navigation but don't move yet
          } else {
            arrowUpCountRef.current = 0;
          }
          return false;
        }
      },
      {
        key: "ArrowDown",
        run: (view) => {
          const { from } = view.state.selection.main;
          const lastLine = view.state.doc.line(view.state.doc.lines);

          if (from >= lastLine.from && from <= lastLine.to && !isLast && onNavigateToNext) {
            arrowDownCountRef.current += 1;
            scheduleCounterReset();

            if (arrowDownCountRef.current >= 2) {
              resetKeyCounters();
              onNavigateToNext(id);
              return true;
            }
            return true; // Prevent default navigation but don't move yet
          } else {
            arrowDownCountRef.current = 0;
          }
          return false;
        }
      }
    ]);
  }, [id, isFirst, isLast, onNavigateToPrevious, onNavigateToNext]);

  // Custom theme to override light mode background color
  const customTheme = useMemo(() => {
    if (theme === 'light') {
      const lightBg = THEME_COLORS.light;
      return EditorView.theme({
        '&': { backgroundColor: lightBg },
        '.cm-content': { backgroundColor: lightBg },
        '.cm-gutters': { backgroundColor: lightBg }
      });
    }
    return [];
  }, [theme]);

  const extensions = useMemo(() => {
    return [
      markdown(),
      customKeymap,
      ...(isWordWrapEnabled ? [EditorView.lineWrapping] : []),
      ...(Array.isArray(customTheme) ? customTheme : [customTheme])
    ];
  }, [customKeymap, isWordWrapEnabled, customTheme]);

  // Render
  return (
    <BlockContainer>
      <BlockHeader justify="between" align="center">
        <Flex gap="2" align="center">
          {sectionType && (
            <Badge color={getSectionTypeColor(sectionType)} size="1">
              {formatSectionType(sectionType)}
            </Badge>
          )}
          {sectionId && (
            <SectionIdText>{sectionId}</SectionIdText>
          )}
        </Flex>

        <Flex gap="2">
          <Tooltip content="Toggle Word Wrap">
            <IconButton
              size="1"
              variant={isWordWrapEnabled ? "solid" : "soft"}
              onClick={() => setIsWordWrapEnabled(!isWordWrapEnabled)}
            >
              <TextAlignLeftIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Add Block">
            <IconButton size="1" variant="soft" onClick={() => onAddBelow(id)}>
              <PlusIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Move Up">
            <IconButton size="1" variant="soft" onClick={() => onMoveUp(id)} disabled={isFirst}>
              <ArrowUpIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Move Down">
            <IconButton size="1" variant="soft" onClick={() => onMoveDown(id)} disabled={isLast}>
              <ArrowDownIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton size="1" variant="soft" color="red" onClick={() => onDelete(id)}>
              <TrashIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      </BlockHeader>

      <EditorWrapper
        ref={editorWrapperRef}
        $minLines={minLines}
        $height={blockHeight}
      >
        <CodeMirror
          value={content}
          height={blockHeight}
          theme={theme}
          extensions={extensions}
          onChange={(value) => onContentChange(id, value)}
          onCreateEditor={(view) => {
            codeMirrorViewRef.current = view;
          }}
        />
      </EditorWrapper>

      <ResizeHandle
        $theme={theme}
        $isResizing={isResizing}
        onMouseDown={handleResizeStart}
      />

      <ActionButtons gap="2" align="center">
        {showCustomAsk && (
          <TextField.Root
            size="1"
            placeholder="Enter your custom question..."
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            style={{ flex: 1 }}
          />
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button size="1" variant="soft">
              Revise
              <DropdownMenu.TriggerIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => handleReviseAction("rewrite")}>Rewrite</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleReviseAction("rephrase")}>Rephrase</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleReviseAction("more-formal")}>More formal</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleReviseAction("more-fun")}>More fun</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelect={() => handleReviseAction("custom-ask")}>Custom Ask</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Button size="1" variant="soft">
          <PlayIcon />
        </Button>
      </ActionButtons>
    </BlockContainer>
  );
}
