import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Button, Callout } from "@radix-ui/themes";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import { selectSections, selectLoading, selectError } from "@/store/slices/documentSlice";
import { sectionsToBlocks } from "@/utils/sectionTransform";
import PanelWrapper from "@/components/PanelWrapper";

export function EditPanel() {
  // Redux selectors
  const sections = useSelector(selectSections);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  // Local state for block management
  const [blocks, setBlocks] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const [focusCursorPosition, setFocusCursorPosition] = useState(null);

  // Transform sections to blocks when sections are loaded
  useEffect(() => {
    if (sections.length > 0) {
      const transformedBlocks = sectionsToBlocks(sections);
      setBlocks(transformedBlocks);
      // Set nextId based on loaded sections (for new blocks)
      setNextId(sections.length + 1);
    }
  }, [sections]);

  // Helper function to renumber blocks within a section
  const renumberBlocksInSection = (blocksList, parentSectionId) => {
    return blocksList.map(block => {
      if (block.parentSectionId === parentSectionId) {
        // Get all blocks in this section
        const sectionBlocks = blocksList.filter(b => b.parentSectionId === parentSectionId);
        const totalBlocks = sectionBlocks.length;
        const blockIndex = sectionBlocks.findIndex(b => b.id === block.id);

        // Generate new ID
        const newId = totalBlocks > 1
          ? `${parentSectionId}.${blockIndex + 1}`
          : parentSectionId;

        return {
          ...block,
          id: newId,
          blockIndex,
          totalBlocks,
          isFirstInSection: blockIndex === 0
        };
      }
      return block;
    });
  };

  // Block operation handlers
  const handleContentChange = (id, newContent) => {
    // Check for auto-split on ---
    const splitPattern = /\n---\n/;
    const block = blocks.find(b => b.id === id);

    if (block && splitPattern.test(newContent)) {
      // Split the block
      const splitIndex = newContent.indexOf('\n---\n');
      const beforeContent = newContent.substring(0, splitIndex); // Exclude \n---\n
      const afterContent = newContent.substring(splitIndex + 5); // Skip \n---\n

      const currentIndex = blocks.findIndex(b => b.id === id);
      const parentSectionId = block.parentSectionId;

      // Update current block with first part
      const updatedBlocks = blocks.map((b, idx) =>
        idx === currentIndex ? { ...b, content: beforeContent } : b
      );

      // Create new block for second part
      const newBlock = {
        id: 'temp-id', // Will be renumbered
        content: afterContent,
        sectionId: block.sectionId,
        sectionType: block.sectionType,
        parentSectionId: parentSectionId,
        blockIndex: 0, // Will be renumbered
        totalBlocks: 0, // Will be renumbered
        isFirstInSection: false
      };

      // Insert new block after current
      updatedBlocks.splice(currentIndex + 1, 0, newBlock);

      // Renumber blocks in the section
      const renumbered = renumberBlocksInSection(updatedBlocks, parentSectionId);
      setBlocks(renumbered);

      // Focus on the new block
      const newBlockId = renumbered[currentIndex + 1].id;
      setFocusedBlockId(newBlockId);
      setFocusCursorPosition({ blockId: newBlockId, position: 0 });
    } else {
      // Normal content update
      setBlocks(blocks.map((block) => (block.id === id ? { ...block, content: newContent } : block)));
    }
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

  const handleMergeUp = (id) => {
    const currentIndex = blocks.findIndex((block) => block.id === id);
    if (currentIndex > 0) {
      const currentBlock = blocks[currentIndex];
      const previousBlock = blocks[currentIndex - 1];

      // Only merge if they're in the same section
      if (currentBlock.parentSectionId === previousBlock.parentSectionId) {
        // Merge content
        const mergedContent = previousBlock.content + "\n\n" + currentBlock.content;

        // Update previous block with merged content
        const updatedBlocks = blocks.map((block, idx) => {
          if (idx === currentIndex - 1) {
            return { ...block, content: mergedContent };
          }
          return block;
        });

        // Remove current block
        updatedBlocks.splice(currentIndex, 1);

        // Renumber blocks in the section
        const renumbered = renumberBlocksInSection(updatedBlocks, currentBlock.parentSectionId);
        setBlocks(renumbered);
      }
    }
  };

  const handleMergeDown = (id) => {
    const currentIndex = blocks.findIndex((block) => block.id === id);
    if (currentIndex < blocks.length - 1) {
      const currentBlock = blocks[currentIndex];
      const nextBlock = blocks[currentIndex + 1];

      // Only merge if they're in the same section
      if (currentBlock.parentSectionId === nextBlock.parentSectionId) {
        // Merge content
        const mergedContent = currentBlock.content + "\n\n" + nextBlock.content;

        // Update current block with merged content
        const updatedBlocks = blocks.map((block, idx) => {
          if (idx === currentIndex) {
            return { ...block, content: mergedContent };
          }
          return block;
        });

        // Remove next block
        updatedBlocks.splice(currentIndex + 1, 1);

        // Renumber blocks in the section
        const renumbered = renumberBlocksInSection(updatedBlocks, currentBlock.parentSectionId);
        setBlocks(renumbered);
      }
    }
  };

  const handleAddBelow = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    const newBlock = {
      id: `new-${nextId}`,
      content: "## New Block, start editing...",
      sectionId: `new-${nextId}`,
      sectionType: "notes",
      parentSectionId: `new-${nextId}`,
      blockIndex: 0,
      totalBlocks: 1,
      isFirstInSection: true
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setNextId(nextId + 1);
  };

  const handleNavigateToPrevious = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index > 0) {
      const previousBlock = blocks[index - 1];
      const cursorPos = previousBlock.content.length;

      setFocusedBlockId(previousBlock.id);
      setFocusCursorPosition({ blockId: previousBlock.id, position: cursorPos });
    }
  };

  const handleNavigateToNext = (id) => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index < blocks.length - 1) {
      const nextBlock = blocks[index + 1];

      setFocusedBlockId(nextBlock.id);
      setFocusCursorPosition({ blockId: nextBlock.id, position: 0 });
    }
  };

  const handleAddBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `new-${nextId}`,
        content: "## New Block, start editing...",
        sectionId: `new-${nextId}`,
        sectionType: "notes",
        parentSectionId: `new-${nextId}`,
        blockIndex: 0,
        totalBlocks: 1,
        isFirstInSection: true
      }
    ]);
    setNextId(nextId + 1);
  };

  return (
    <PanelWrapper>
      {!loading && !error && blocks.length === 0 && (
        <Callout.Root style={{ marginBottom: "16px" }}>
          <Callout.Text>No sections loaded. Click "Add New Block" to start.</Callout.Text>
        </Callout.Root>
      )}

      {!loading &&
        blocks.map((block, index) => {
          // Check if merge up/down is possible (must be in same section)
          const canMergeUp = index > 0 && blocks[index - 1].parentSectionId === block.parentSectionId;
          const canMergeDown = index < blocks.length - 1 && blocks[index + 1].parentSectionId === block.parentSectionId;

          return (
            <MarkdownBlock
              key={block.id}
              id={block.id}
              content={block.content}
              onContentChange={handleContentChange}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onMergeUp={handleMergeUp}
              onMergeDown={handleMergeDown}
              onAddBelow={handleAddBelow}
              onNavigateToPrevious={handleNavigateToPrevious}
              onNavigateToNext={handleNavigateToNext}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              canMergeUp={canMergeUp}
              canMergeDown={canMergeDown}
              sectionType={block.sectionType}
              sectionId={block.sectionId}
              shouldFocus={block.id === focusedBlockId}
              focusCursorPosition={focusCursorPosition?.blockId === block.id ? focusCursorPosition.position : null}
              isFirstInSection={block.isFirstInSection}
              blockIndex={block.blockIndex}
              totalBlocks={block.totalBlocks}
            />
          );
        })}

      {!loading && (
        <Button size="3" variant="soft" style={{ width: "100%", marginTop: "16px" }} onClick={handleAddBlock}>
          + Add New Block
        </Button>
      )}
    </PanelWrapper>
  );
}
