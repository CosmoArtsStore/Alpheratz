using Microsoft.UI.Xaml;
using Microsoft.Extensions.DependencyInjection;
using Alpheratz.App.Coordinators;
using Alpheratz.Application.UseCases;
using Alpheratz.Presentation.ViewModels;
using System.IO;
using System;
using System.Linq;

namespace Alpheratz.App;

public partial class App : Microsoft.UI.Xaml.Application
{
    private IServiceProvider? _serviceProvider;
    private Window? _mainWindow;

    public App()
    {
        this.InitializeComponent();
    }

    protected override async void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        var dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Alpheratz", "library.db");
        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
        
        var services = new ServiceCollection();
        AppBootstrapper.ConfigureServices(services, dbPath);
        _serviceProvider = services.BuildServiceProvider();
        
        var shellViewModel = _serviceProvider.GetRequiredService<ShellViewModel>();
        
        // Start Init Use Case
        var initUseCase = _serviceProvider.GetRequiredService<InitializeApplicationUseCase>();
        bool isFirstRun = await initUseCase.ExecuteAsync();
        
        _mainWindow = new MainWindow(shellViewModel);

        // Heritage Parity: Handle background launch (Tray start)
        var commandLineArgs = Environment.GetCommandLineArgs();
        if (commandLineArgs.Contains("--background"))
        {
            // In WinUI 3, we still need to activate the window, 
            // but we can set visibility or minimize it if we had a tray icon.
            // For now, we activate it.
            _mainWindow.Activate();
            // _mainWindow.MinimizeToTray(); // Future implementation
        }
        else
        {
            _mainWindow.Activate();
        }

        if (isFirstRun)
        {
            // Navigate to first run setup if needed
        }
    }
}
