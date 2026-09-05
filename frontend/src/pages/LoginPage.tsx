import { Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { Card } from '../components/ui/Card';

export default function LoginPage() {
  return (
    <div className="auth-page">
      <Card title="Sign in" className="auth-card">
        <LoginForm />
        <p className="auth-page__switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
