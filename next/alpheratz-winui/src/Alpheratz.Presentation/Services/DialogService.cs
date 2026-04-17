using Alpheratz.Contracts.Presentation;

namespace Alpheratz.Presentation.Services;

public sealed class DialogService : IDialogService
{
    public event EventHandler<DialogRequest>? DialogRequested;

    public void Show(DialogRequest request)
    {
        DialogRequested?.Invoke(this, request);
    }
}
