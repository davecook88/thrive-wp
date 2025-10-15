import { useEffect, useState } from "@wordpress/element";

interface CancellationPolicy {
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  allowRescheduling: boolean;
  reschedulingDeadlineHours: number;
  maxReschedulesPerBooking: number;
  refundCreditsOnCancel: boolean;
}

export default function BookingPolicyNotice() {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await fetch("/api/policies/cancellation");
        if (!response.ok) {
          throw new Error(`Failed to fetch policy: ${response.statusText}`);
        }
        const data = await response.json();
        setPolicy(data);
      } catch (err: any) {
        console.error("Failed to load booking policy:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <div className="booking-policy-notice">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-policy-notice">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">
            Unable to load booking policies. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return null;
  }

  const messages: string[] = [];

  if (policy.allowCancellation) {
    messages.push(
      `✅ You can cancel up to ${policy.cancellationDeadlineHours} hours before your class`
    );
  } else {
    messages.push(`❌ Cancellations are not allowed`);
  }

  if (policy.allowRescheduling) {
    messages.push(
      `🔄 You can reschedule up to ${policy.maxReschedulesPerBooking} times per booking (at least ${policy.reschedulingDeadlineHours} hours before)`
    );
  } else {
    messages.push(`❌ Rescheduling is not allowed`);
  }

  if (policy.refundCreditsOnCancel) {
    messages.push(`💳 Credits are refunded when you cancel`);
  } else {
    messages.push(`💰 Credits are not refunded when you cancel`);
  }

  return (
    <div className="booking-policy-notice">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-blue-800 mb-3">
          📋 Booking Policy
        </h4>
        <ul className="space-y-2">
          {messages.map((message, index) => (
            <li key={index} className="text-blue-700 text-sm">
              {message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
