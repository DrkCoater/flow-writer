import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "@emotion/styled";
import { Theme, Spinner, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from "@/components/Toolbar";
import { EditPanel } from "@/components/EditPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { selectTheme, selectIsEditing, selectIsPreviewing, selectIsSyncScrollEnabled } from "@/store/slices/globalSlice";
import { loadDocument, selectLoading, selectError } from "@/store/slices/documentSlice";
import "@styles/app.scss";

const ThemeWrapper = styled(Theme)`
  height: 100%;
  width: 100%;
  display: block;
`;

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const isEditing = useSelector(selectIsEditing);
  const isPreviewing = useSelector(selectIsPreviewing);
  const isSyncScrollEnabled = useSelector(selectIsSyncScrollEnabled);

  const editPanelRef = useRef(null);
  const previewPanelRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    dispatch(loadDocument());
  }, [dispatch]);

  // Synchronized scrolling handler
  const handleEditorScroll = () => {
    if (!isSyncScrollEnabled || isSyncingRef.current) return;

    const editPanel = editPanelRef.current;
    const previewPanel = previewPanelRef.current;

    if (editPanel && previewPanel) {
      isSyncingRef.current = true;

      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = editPanel;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        const targetScrollHeight = previewPanel.scrollHeight;
        const targetClientHeight = previewPanel.clientHeight;
        const targetScrollTop = scrollPercentage * (targetScrollHeight - targetClientHeight);

        previewPanel.scrollTop = targetScrollTop;

        // Reset flag after a short delay
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      });
    }
  };

  const handlePreviewScroll = () => {
    if (!isSyncScrollEnabled || isSyncingRef.current) return;

    const editPanel = editPanelRef.current;
    const previewPanel = previewPanelRef.current;

    if (editPanel && previewPanel) {
      isSyncingRef.current = true;

      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = previewPanel;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        const targetScrollHeight = editPanel.scrollHeight;
        const targetClientHeight = editPanel.clientHeight;
        const targetScrollTop = scrollPercentage * (targetScrollHeight - targetClientHeight);

        editPanel.scrollTop = targetScrollTop;

        // Reset flag after a short delay
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      });
    }
  };

  const bothActive = isEditing && isPreviewing;
  const neitherActive = !isEditing && !isPreviewing;

  return (
    <ThemeWrapper appearance={theme}>
      <div className="app-container">
        <Toolbar />
        <div className="content-area">
          {loading && (
            <div className="loading-container">
              <Spinner size="3" />
            </div>
          )}

          {error && (
            <Callout.Root color="red" style={{ marginBottom: "1rem" }}>
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {neitherActive && (
            <div className="empty-panel">
              <h3>No Panel Active</h3>
              <p>Click "Edit" or "Preview" in the toolbar to begin.</p>
            </div>
          )}

          <div className="panels-container">
            {bothActive ? (
              <PanelGroup direction="horizontal">
                <Panel defaultSize={50} minSize={20}>
                  <EditPanel ref={editPanelRef} onScroll={handleEditorScroll} />
                </Panel>
                <PanelResizeHandle className="resize-handle" />
                <Panel defaultSize={50} minSize={20}>
                  <PreviewPanel ref={previewPanelRef} onScroll={handlePreviewScroll} />
                </Panel>
              </PanelGroup>
            ) : (
              <>
                {isEditing && <EditPanel />}
                {isPreviewing && <PreviewPanel />}
              </>
            )}
          </div>
        </div>
      </div>
    </ThemeWrapper>
  );
}

export default App;
