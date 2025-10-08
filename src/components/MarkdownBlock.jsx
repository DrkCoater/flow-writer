import { Button, Flex, Tabs, Tooltip, IconButton } from "@radix-ui/themes";
import { PlayIcon, Pencil1Icon, PlusIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from "@radix-ui/react-icons";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  isLast
}) {
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
          <Tabs.List>
            <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
            <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
          </Tabs.List>

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
          <CodeMirror
            value={content}
            height="200px"
            theme="dark"
            extensions={[markdown()]}
            onChange={(value) => onContentChange(id, value)}
          />
        </Tabs.Content>

        <Tabs.Content value="preview">
          <div className="preview-container">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <div className="action-buttons">
        <Button size="1" variant="soft">
          Revise
        </Button>
        <Button size="1" variant="soft">
          <PlayIcon />
        </Button>
      </div>
    </div>
  );
}
