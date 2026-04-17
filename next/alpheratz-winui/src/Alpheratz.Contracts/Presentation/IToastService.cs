namespace Alpheratz.Contracts.Presentation;

public interface IToastService
{
    event EventHandler<ToastNotification>? ToastRequested;

    void Show(ToastNotification notification);
}
