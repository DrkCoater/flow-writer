import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import styled from "@emotion/styled";
import { Button, Flex, Tabs, Tooltip, IconButton, DropdownMenu, TextField, Badge } from "@radix-ui/themes";
import { PlayIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from "@radix-ui/react-icons";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { keymap } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSectionTypeColor, formatSectionType } from "../utils/sectionTransform";
import { selectTheme } from "../store/slices/globalSlice";
import { colors, spacing, radii } from "../styles/tokens";

const BlockContainer = styled.div`
  width: 100%;
  border: 1px solid ${colors.border.default};
  border-radius: ${radii.lg};
  overflow: hidden;
  margin: ${spacing.xxl} 0 ${spacing.lg} 0;
  background-color: ${colors.background.elevated};
`;

const PreviewContainer = styled.div`
  padding: ${spacing.lg};
  min-height: 100px;
  background-color: ${colors.background.base};
  color: ${colors.text.primary};

  h1, h2, h3, h4, h5, h6 {
    margin-top: ${spacing.lg};
    margin-bottom: ${spacing.sm};
    color: ${colors.text.primary};
  }

  p {
    margin-bottom: ${spacing.md};
    line-height: 1.6;
  }

  code {
    background-color: ${colors.background.active};
    padding: 2px 6px;
    border-radius: ${radii.sm};
    font-family: "Courier New", monospace;
    color: ${colors.text.primary};
  }

  pre {
    background-color: ${colors.background.active};
    padding: ${spacing.md};
    border-radius: ${radii.md};
    overflow-x: auto;

    code {
      background-color: transparent;
    }
  }

  ul, ol {
    margin-bottom: ${spacing.md};
    padding-left: ${spacing.xl};
  }

  table {
    border-collapse: collapse;
    margin-bottom: ${spacing.md};
  }

  th, td {
    border: 1px solid ${colors.border.default};
    padding: ${spacing.sm};
  }

  th {
    background-color: ${colors.background.active};
  }
`;

const EditorWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: ${props => `${props.$minLines * 1.5}em`};
  max-height: ${props => `${props.$maxLines * 1.5}em`};
  height: ${props => `${props.$clampedLines * 1.5}em`};
  overflow: auto;

  .cm-editor {
    height: 100%;
  }

  .cm-scroller {
    overflow: auto;
  }
`;

const ActionButtons = styled(Flex)`
  padding: ${spacing.sm};
  border-top: 1px solid ${colors.border.default};
  background-color: ${colors.background.elevated};
`;

export function MarkdownBlock({
  id,
  content,
  isRendered,
  onContentChange,
  onToggleRender,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onMergeWithPrevious,
  isFirst,
  isLast,
  sectionType,
  sectionId,
  minLines = 2,
  maxLines = 10,
  justMerged = false,
  mergeCursorPosition = null
}) {
  const theme = useSelector(selectTheme);
  const [showCustomAsk, setShowCustomAsk] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const codeMirrorViewRef = useRef(null);
  const editorWrapperRef = useRef(null);

  // Set cursor position and scroll into view after merge
  useEffect(() => {
    if (justMerged && mergeCursorPosition !== null && codeMirrorViewRef.current) {
      // Use setTimeout to ensure DOM has updated and CodeMirror has rendered
      const timeoutId = setTimeout(() => {
        const view = codeMirrorViewRef.current;
        if (!view) return;

        // Set cursor position and scroll into view in one dispatch
        view.dispatch({
          selection: { anchor: mergeCursorPosition, head: mergeCursorPosition },
          scrollIntoView: true
        });

        // Focus the editor
        view.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [justMerged, mergeCursorPosition, id]);

  // Calculate dynamic height based on actual content lines
  const clampedLines = useMemo(() => {
    const lineCount = content.split("\n").length;
    return Math.max(minLines, Math.min(maxLines, lineCount));
  }, [content, minLines, maxLines]);

  // Custom keymap extension for backspace at start
  const customKeymap = useMemo(() => {
    return keymap.of([
      {
        key: "Backspace",
        run: (view) => {
          // Check if cursor is at position 0
          const { from, to } = view.state.selection.main;
          if (from === 0 && to === 0 && !isFirst) {
            // Trigger merge with previous block
            const cursorPosition = onMergeWithPrevious(id);

            // The block will be removed, and the previous block will have the merged content
            // We don't need to do anything else here as the component will unmount
            return true; // Prevent default backspace behavior
          }
          return false; // Allow default backspace behavior
        }
      }
    ]);
  }, [id, isFirst, onMergeWithPrevious]);

  const extensions = useMemo(() => {
    return [markdown(), customKeymap];
  }, [customKeymap]);

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
      <Tabs.Root
        value={isRendered ? "preview" : "edit"}
        onValueChange={(value) => {
          if ((value === "preview" && !isRendered) || (value === "edit" && isRendered)) {
            onToggleRender(id);
          }
        }}
      >
        <Flex justify="between" align="center">
          <Flex gap="2" align="center">
            <Tabs.List>
              <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
            </Tabs.List>
            {sectionType && (
              <Badge color={getSectionTypeColor(sectionType)} size="1">
                {formatSectionType(sectionType)}
              </Badge>
            )}
            {sectionId && (
              <span style={{ fontSize: "12px", color: "var(--gray-10)", fontFamily: "monospace" }}>{sectionId}</span>
            )}
          </Flex>

          <Flex gap="2" style={{ marginRight: "12px" }}>
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

        <Tabs.Content value="edit">
          <EditorWrapper
            ref={editorWrapperRef}
            $minLines={minLines}
            $maxLines={maxLines}
            $clampedLines={clampedLines}
          >
            <CodeMirror
              value={content}
              height="100%"
              theme={theme}
              extensions={extensions}
              onChange={(value) => onContentChange(id, value)}
              onCreateEditor={(view) => {
                codeMirrorViewRef.current = view;
              }}
            />
          </EditorWrapper>
        </Tabs.Content>

        <Tabs.Content value="preview">
          <PreviewContainer>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </PreviewContainer>
        </Tabs.Content>
      </Tabs.Root>

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
