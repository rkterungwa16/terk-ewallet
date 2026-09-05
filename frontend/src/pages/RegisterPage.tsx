import { Link } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { Card } from '../components/ui/Card';

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <Card title="Create your wallet" className="auth-card">
        <RegisterForm />
        <p className="auth-page__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
