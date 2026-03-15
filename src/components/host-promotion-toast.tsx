import Image from "next/image";

type HostPromotionToastProps = {
  message: string;
  onDismiss: () => void;
};

export function HostPromotionToast({
  message,
  onDismiss,
}: HostPromotionToastProps) {
  return (
    <div className="host-promotion-toast" role="alert">
      <p className="host-promotion-toast-message">{message}</p>
      <button
        aria-label="Dismiss notification"
        className="host-promotion-toast-close"
        onClick={onDismiss}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="toast-close-icon"
          height={24}
          src="/icons/close.svg"
          width={24}
        />
      </button>
    </div>
  );
}
