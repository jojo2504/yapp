import { useParams } from 'react-router-dom';
import ExamGuard from '../../components/UI/ExamGuard';

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  return <ExamGuard examId={examId} />;
}
