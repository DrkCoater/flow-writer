import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button, Flex, Tabs, Tooltip, IconButton, DropdownMenu, TextField, Badge } from "@radix-ui/themes";
import { PlayIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from "@radix-ui/react-icons";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { keymap } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSectionTypeColor, formatSectionType } from "../utils/sectionTransform";
import "./MarkdownBlock.scss";

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
  justMerged = false
}) {
  const [showCustomAsk, setShowCustomAsk] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const editorViewRef = useRef(null);
  const editorWrapperRef = useRef(null);

  // Auto-scroll to bottom after merge
  useEffect(() => {
    if (justMerged) {
      // Use setTimeout to ensure DOM has updated and CodeMirror has rendered
      const timeoutId = setTimeout(() => {
        if (!editorWrapperRef.current) return;

        // Try multiple selectors to find the scrollable element
        const scrollElement =
          editorWrapperRef.current.querySelector(".cm-scroller") ||
          editorWrapperRef.current.querySelector(".cm-content");

        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }

        // Also scroll the wrapper itself
        editorWrapperRef.current.scrollTop = editorWrapperRef.current.scrollHeight;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [justMerged, id]);

  // Calculate dynamic height based on actual content lines
  const editorStyle = useMemo(() => {
    const lineCount = content.split("\n").length;
    const clampedLines = Math.max(minLines, Math.min(maxLines, lineCount));
    // Using 1.5em per line which is more semantic than pixels
    return {
      minHeight: `${minLines * 1.5}em`,
      maxHeight: `${maxLines * 1.5}em`,
      height: `${clampedLines * 1.5}em`,
      overflow: "auto"
    };
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
    <div className="block-container">
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
          <div ref={editorWrapperRef} className="editor-wrapper" style={editorStyle}>
            <CodeMirror
              value={content}
              height="100%"
              theme="dark"
              extensions={extensions}
              onChange={(value) => onContentChange(id, value)}
            />
          </div>
        </Tabs.Content>

        <Tabs.Content value="preview">
          <div className="preview-container">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <Flex className="action-buttons" gap="2" align="center">
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
      </Flex>
    </div>
  );
}
