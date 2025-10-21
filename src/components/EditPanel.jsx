import { forwardRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button, Callout } from "@radix-ui/themes";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import {
  selectBlocks,
  selectLoading,
  selectError,
  selectFocusedBlockId,
  selectFocusCursorPosition,
  updateBlockContent,
  deleteBlock,
  moveBlockUp,
  moveBlockDown,
  mergeBlockUp,
  mergeBlockDown,
  addBlockBelow,
  addNewBlock,
  navigateToPreviousBlock,
  navigateToNextBlock,
} from "@/store/slices/documentSlice";
import PanelWrapper from "@/components/PanelWrapper";

export const EditPanel = forwardRef(({ onScroll }, ref) => {
  const dispatch = useDispatch();

  // Redux selectors
  const blocks = useSelector(selectBlocks);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const focusedBlockId = useSelector(selectFocusedBlockId);
  const focusCursorPosition = useSelector(selectFocusCursorPosition);

  // Block operation handlers - all dispatch to Redux
  const handleContentChange = (id, content) => {
    dispatch(updateBlockContent({ blockId: id, content }));
  };

  const handleDelete = (id) => {
    dispatch(deleteBlock({ blockId: id }));
  };

  const handleMoveUp = (id) => {
    dispatch(moveBlockUp({ blockId: id }));
  };

  const handleMoveDown = (id) => {
    dispatch(moveBlockDown({ blockId: id }));
  };

  const handleMergeUp = (id) => {
    dispatch(mergeBlockUp({ blockId: id }));
  };

  const handleMergeDown = (id) => {
    dispatch(mergeBlockDown({ blockId: id }));
  };

  const handleAddBelow = (id) => {
    dispatch(addBlockBelow({ blockId: id }));
  };

  const handleNavigateToPrevious = (id) => {
    dispatch(navigateToPreviousBlock({ blockId: id }));
  };

  const handleNavigateToNext = (id) => {
    dispatch(navigateToNextBlock({ blockId: id }));
  };

  const handleAddBlock = () => {
    dispatch(addNewBlock());
  };

  return (
    <PanelWrapper ref={ref} onScroll={onScroll}>
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
});

EditPanel.displayName = 'EditPanel';
