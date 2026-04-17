using Alpheratz.App.Coordinators;
using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Windowing;
using WinRT.Interop;
using Alpheratz.Contracts.Infrastructure;

namespace Alpheratz.App;

/// <summary>
/// Interaction logic for MainWindow.xaml.
/// Serves as the visual root and handles system-level window integration.
/// </summary>
public sealed partial class MainWindow : Window
{
    private readonly WindowChromeCoordinator _chromeCoordinator;
    private readonly ILoggingFacade _logger;

    public MainWindow(
        ShellViewModel shellViewModel, 
        WindowChromeCoordinator chromeCoordinator,
        ILoggingFacade logger)
    {
        _chromeCoordinator = chromeCoordinator;
        _logger = logger;

        InitializeComponent();

        // Data Context setup
        ShellPageHost.DataContext = shellViewModel;

        // Initialize Window state
        ConfigureWindow();
        
        _logger.Info("MainWindow", "Initialize", "MainWindow initialized with ShellViewModel.");
    }

    private void ConfigureWindow()
    {
        // Use Coordinator to handle chrome details
        _chromeCoordinator.ExtendContentIntoTitleBar(true);
        _chromeCoordinator.SetTitle("Alpheratz");

        // Set minimal size for the window
        var hWnd = WindowNative.GetWindowHandle(this);
        var windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hWnd);
        var appWindow = AppWindow.GetFromWindowId(windowId);
        
        if (appWindow != null)
        {
            // Initial size - could be loaded from settings later
            appWindow.Resize(new Windows.Graphics.SizeInt32 { Width = 1200, Height = 800 });
        }
    }
}
