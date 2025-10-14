import { Theme, Flex, Button, Spinner, Callout } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { MarkdownBlock } from "./components/MarkdownBlock";
import { Toolbar } from "./components/Toolbar";
import { useContextDocument } from "./hooks/useContextDocument";
import { sectionsToBlocks } from "./utils/sectionTransform";
import { selectTheme } from "./store/slices/globalSlice";

function App() {
  const theme = useSelector(selectTheme);
  const { sections, loading, error } = useContextDocument();
  const [blocks, setBlocks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [justMergedBlockId, setJustMergedBlockId] = useState(null);

  // Load sections from backend
  useEffect(() => {
    if (sections.length > 0) {
      const transformedBlocks = sectionsToBlocks(sections);
      setBlocks(transformedBlocks);
      // Set nextId based on loaded sections (for new blocks)
      setNextId(sections.length + 1);
    }
  }, [sections]);

  const handleContentChange = (id, newContent) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, content: newContent } : block)));
  };

  const handleToggleRender = (id) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, isRendered: !block.isRendered } : block)));
  };

  const handleDelete = (id) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter((block) => block.id !== id));
    }
  };

  const handleMoveUp = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    }
  };

  const handleMoveDown = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  const handleAddBelow = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    const newBlock = {
      id: `new-${nextId}`,
      content: "## New Block, start editing...",
      isRendered: false,
      sectionId: `new-${nextId}`,
      sectionType: "notes"
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setNextId(nextId + 1);
  };

  const handleMergeWithPrevious = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index > 0) {
      const currentBlock = blocks[index];
      const previousBlock = blocks[index - 1];
      
      // Merge content: previous content + current content
      const mergedContent = previousBlock.content + '\n' + currentBlock.content;
      
      // Update previous block with merged content
      const newBlocks = blocks.map((block, idx) => {
        if (idx === index - 1) {
          return { ...block, content: mergedContent, isRendered: false };
        }
        return block;
      });
      
      // Remove current block
      newBlocks.splice(index, 1);
      
      setBlocks(newBlocks);
      
      // Signal which block just received merged content
      setJustMergedBlockId(previousBlock.id);
      
      // Clear the signal after a short delay (longer than the scroll timeout)
      setTimeout(() => setJustMergedBlockId(null), 300);
      
      // Return the cursor position where the merge happened (length of previous content)
      return previousBlock.content.length;
    }
    return null;
  };

  const handleAddBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `new-${nextId}`,
        content: "## New Block, start editing...",
        isRendered: false,
        sectionId: `new-${nextId}`,
        sectionType: "notes"
      }
    ]);
    setNextId(nextId + 1);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }}>
      <Toolbar />
      <Theme appearance={theme} style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Flex
          direction="column"
          align="center"
          gap="4"
          style={{
            padding: "2rem 4rem",
            width: "100%"
          }}
        >
          <div style={{ width: "100%" }}>
            {loading && (
              <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
                <Spinner size="3" />
              </Flex>
            )}

            {error && (
              <Callout.Root color="red" style={{ marginBottom: "16px" }}>
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <strong>Error loading document:</strong> {error}
                </Callout.Text>
              </Callout.Root>
            )}

            {!loading && !error && blocks.length === 0 && (
              <Callout.Root style={{ marginBottom: "16px" }}>
                <Callout.Text>No sections loaded. Click "Add New Block" to start.</Callout.Text>
              </Callout.Root>
            )}

            {!loading &&
              blocks.map((block, index) => (
                <MarkdownBlock
                  key={block.id}
                  id={block.id}
                  content={block.content}
                  isRendered={block.isRendered}
                  onContentChange={handleContentChange}
                  onToggleRender={handleToggleRender}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onAddBelow={handleAddBelow}
                  onMergeWithPrevious={handleMergeWithPrevious}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                  sectionType={block.sectionType}
                  sectionId={block.sectionId}
                  justMerged={block.id === justMergedBlockId}
                />
              ))}

            {!loading && (
              <Button size="3" variant="soft" style={{ width: "100%", marginTop: "16px" }} onClick={handleAddBlock}>
                + Add New Block
              </Button>
            )}
          </div>
        </Flex>
      </Theme>
    </div>
  );
}

export default App;
