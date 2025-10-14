import React, { useState, useMemo } from "react";
import { Button, Flex, Tabs, Tooltip, IconButton, DropdownMenu, TextField, Badge } from "@radix-ui/themes";
import { PlayIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from "@radix-ui/react-icons";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
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
  isFirst,
  isLast,
  sectionType,
  sectionId,
  minLines = 2,
  maxLines = 10
}) {
  const [showCustomAsk, setShowCustomAsk] = useState(false);
  const [customQuery, setCustomQuery] = useState("");

  // Calculate dynamic height based on actual content lines
  const editorStyle = useMemo(() => {
    const lineCount = content.split('\n').length;
    const clampedLines = Math.max(minLines, Math.min(maxLines, lineCount));
    // Using 1.5em per line which is more semantic than pixels
    return {
      minHeight: `${minLines * 1.5}em`,
      maxHeight: `${maxLines * 1.5}em`,
      height: `${clampedLines * 1.5}em`,
      overflow: 'auto'
    };
  }, [content, minLines, maxLines]);

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
              <span style={{ fontSize: '12px', color: 'var(--gray-10)', fontFamily: 'monospace' }}>
                {sectionId}
              </span>
            )}
          </Flex>

          <Flex gap="2">
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
          <div className="editor-wrapper" style={editorStyle}>
            <CodeMirror
              value={content}
              height="100%"
              theme="dark"
              extensions={[markdown()]}
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
