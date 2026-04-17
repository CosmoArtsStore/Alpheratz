using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using WinRT.Interop;

namespace Alpheratz.App.Coordinators;

/// <summary>
/// Customizes the window title bar and system non-client areas.
/// </summary>
public class WindowChromeCoordinator
{
    private readonly AppWindow _appWindow;

    public WindowChromeCoordinator(Window window)
    {
        var hWnd = WindowNative.GetWindowHandle(window);
        var windowId = Win32Interop.GetWindowIdFromWindow(hWnd);
        _appWindow = AppWindow.GetFromWindowId(windowId);
    }

    /// <summary>
    /// Extends the app content into the title bar area.
    /// </summary>
    public void ExtendContentIntoTitleBar(bool extend)
    {
        _appWindow.TitleBar.ExtendsContentIntoTitleBar = extend;
        if (extend)
        {
            _appWindow.TitleBar.ButtonBackgroundColor = Colors.Transparent;
            _appWindow.TitleBar.ButtonInactiveBackgroundColor = Colors.Transparent;
        }
    }

    /// <summary>
    /// Sets the window title.
    /// </summary>
    public void SetTitle(string title)
    {
        _appWindow.Title = title;
    }
}
