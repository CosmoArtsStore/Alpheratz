using Alpheratz.Contracts.Presentation;

namespace Alpheratz.Presentation.Services;

public sealed class ToastService : IToastService
{
    public event EventHandler<ToastNotification>? ToastRequested;

    public void Show(ToastNotification notification)
    {
        ToastRequested?.Invoke(this, notification);
    }
}
