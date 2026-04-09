import { useLocation, Link } from 'react-router-dom'

export default function PendingApproval() {
  const location = useLocation()
  const email = location.state?.email || ''

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">

        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🏪</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application under review</h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Thank you for registering as a shop owner on Tejam.
          Our team is reviewing your application and will approve it shortly.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-3">What happens next?</p>
          <ol className="space-y-2">
            {[
              'Our team reviews your shop details (usually within 24 hours)',
              'You receive an in-app notification once approved',
              'Log in and start listing your surplus food bags',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-amber-700">
                <span className="w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {email && (
          <p className="text-sm text-gray-500 mb-6">
            We'll send updates to <span className="font-semibold text-gray-700">{email}</span>
          </p>
        )}

        <Link
          to="/login"
          className="btn-primary w-full py-3 text-sm font-semibold inline-block"
        >
          Back to sign in
        </Link>

        <p className="mt-4 text-xs text-gray-400">
          Questions? Contact us at{' '}
          <a href="mailto:support@tejam.uz" className="text-primary-600 hover:underline">
            support@tejam.uz
          </a>
        </p>
      </div>
    </div>
  )
}
