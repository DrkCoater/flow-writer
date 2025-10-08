import { Button, Flex } from "@radix-ui/themes";
import { PlayIcon } from "@radix-ui/react-icons";
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
      <div className="control-bar">
        <Flex gap="2">
          <Button size="1" variant="soft" onClick={() => onToggleRender(id)}>
            {isRendered ? "Edit" : "Run"}
          </Button>
          <Button size="1" variant="soft" onClick={() => onAddBelow(id)}>
            + Add Block
          </Button>
        </Flex>
        <Flex gap="2">
          <Button size="1" variant="soft" onClick={() => onMoveUp(id)} disabled={isFirst}>
            Up
          </Button>
          <Button size="1" variant="soft" onClick={() => onMoveDown(id)} disabled={isLast}>
            Down
          </Button>
          <Button size="1" variant="soft" color="red" onClick={() => onDelete(id)}>
            Delete
          </Button>
        </Flex>
      </div>

      {isRendered ? (
        <div className="preview-container">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <CodeMirror
          value={content}
          height="200px"
          theme="dark"
          extensions={[markdown()]}
          onChange={(value) => onContentChange(id, value)}
        />
      )}
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
