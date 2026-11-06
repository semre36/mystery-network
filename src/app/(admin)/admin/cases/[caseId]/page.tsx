import { AdminCaseEditorView } from "@/components/admin/case-editor-view";

export const metadata = {
  title: "Case Scenario Blueprint | Mystery Network Admin",
};

export default async function AdminCaseDetailPage(props: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await props.params;
  return <AdminCaseEditorView caseId={caseId} />;
}
