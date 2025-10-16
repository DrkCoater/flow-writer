import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "@emotion/styled";
import { Theme, Spinner, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Toolbar } from "./components/Toolbar";
import { EditPanel } from "./components/EditPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { selectTheme, selectIsEditing, selectIsPreviewing } from "./store/slices/globalSlice";
import { loadDocument, selectLoading, selectError } from "./store/slices/documentSlice";
import { colors, spacing } from "./styles/tokens";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 2rem 4rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const PanelsContainer = styled.div`
  display: ${props => props.$bothActive ? 'grid' : 'flex'};
  grid-template-columns: ${props => props.$bothActive ? '1fr 1fr' : 'none'};
  gap: ${props => props.$bothActive ? spacing.lg : '0'};
  flex: 1;
  overflow: hidden;
`;

const PanelWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  border: 1px solid ${colors.border.subtle};
  border-radius: 8px;
  background-color: ${colors.background.elevated};
`;

const EmptyPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${colors.text.tertiary};
  background-color: ${colors.background.base};
  border: 1px solid ${colors.border.subtle};
  border-radius: 8px;
  padding: ${spacing.xxl};

  h3 {
    font-size: 1.25rem;
    font-weight: 500;
    margin-bottom: ${spacing.md};
    color: ${colors.text.secondary};
  }

  p {
    font-size: 0.875rem;
    text-align: center;
    line-height: 1.6;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const isEditing = useSelector(selectIsEditing);
  const isPreviewing = useSelector(selectIsPreviewing);

  useEffect(() => {
    dispatch(loadDocument());
  }, [dispatch]);

  const bothActive = isEditing && isPreviewing;
  const neitherActive = !isEditing && !isPreviewing;

  return (
    <Theme appearance={theme}>
      <AppContainer>
        <Toolbar />

        <ContentArea>
          {loading && (
            <LoadingContainer>
              <Spinner size="3" />
            </LoadingContainer>
          )}

          {error && (
            <Callout.Root color="red" style={{ marginBottom: spacing.lg }}>
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                <strong>Error loading document:</strong> {error}
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && !error && (
            <PanelsContainer $bothActive={bothActive}>
              {isEditing && (
                <PanelWrapper>
                  <EditPanel />
                </PanelWrapper>
              )}

              {isPreviewing && (
                <PanelWrapper>
                  <PreviewPanel />
                </PanelWrapper>
              )}

              {neitherActive && (
                <EmptyPanel>
                  <h3>No Panel Active</h3>
                  <p>
                    Enable Edit or Preview mode from the toolbar above<br />
                    to start working with your document.
                  </p>
                </EmptyPanel>
              )}
            </PanelsContainer>
          )}
        </ContentArea>
      </AppContainer>
    </Theme>
  );
}

export default App;
