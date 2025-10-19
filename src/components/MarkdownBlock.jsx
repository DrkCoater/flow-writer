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
  display: flex;
  flex-direction: column;
  min-height: ${props => `${props.$minLines * 1.5}em`};
  height: ${props => props.$height || 'auto'};

  .cm-editor {
    height: auto;
  }

  .cm-scroller {
    overflow-x: auto;
    overflow-y: ${props => props.$height && props.$height !== 'auto' ? 'auto' : 'visible'};
  }
`;

const ResizeHandle = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${colors.background.elevated};
  border-top: 1px solid ${colors.border.default};
  transition: background-color 0.2s ease;
  user-select: none;

  &::before {
    content: '⋮⋮';
    font-size: 10px;
    color: ${colors.text.tertiary};
    letter-spacing: 2px;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  &:hover {
    background-color: ${colors.background.hover};

    &::before {
      opacity: 1;
    }
  }

  ${props => props.$isResizing && `
    background-color: ${colors.background.hover};

    &::before {
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

  // Key press tracking
  const arrowUpCountRef = useRef(0);
  const arrowDownCountRef = useRef(0);
  const keyResetTimerRef = useRef(null);

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

  // Helper to reset key counters
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

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = editorWrapperRef.current?.offsetHeight || 0;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const minHeight = minLines * 1.5 * 16; // 16px base font size

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

  // Custom keymap extension for special key behaviors
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

  const extensions = useMemo(() => {
    return [
      markdown(),
      customKeymap,
      ...(isWordWrapEnabled ? [EditorView.lineWrapping] : [])
    ];
  }, [customKeymap, isWordWrapEnabled]);

  const handleReviseAction = (action) => {
    if (action === "custom-ask") {
      setShowCustomAsk(true);
    } else {
      setShowCustomAsk(false);
      console.log("Revise action:", action);
    }
  };

  return (
    <BlockContainer>
      <Flex justify="between" align="center" style={{ padding: "8px 12px" }}>
        <Flex gap="2" align="center">
          {sectionType && (
            <Badge color={getSectionTypeColor(sectionType)} size="1">
              {formatSectionType(sectionType)}
            </Badge>
          )}
          {sectionId && (
            <span style={{ fontSize: "12px", color: "var(--gray-10)", fontFamily: "monospace" }}>{sectionId}</span>
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
      </Flex>

      <EditorWrapper
        ref={editorWrapperRef}
        $minLines={minLines}
        $height={blockHeight}
      >
        <CodeMirror
          value={content}
          height="auto"
          theme={theme}
          extensions={extensions}
          onChange={(value) => onContentChange(id, value)}
          onCreateEditor={(view) => {
            codeMirrorViewRef.current = view;
          }}
        />
      </EditorWrapper>

      <ResizeHandle
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
