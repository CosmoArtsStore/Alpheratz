using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Alpheratz.Contracts.Navigation;
using Alpheratz.Application.UseCases;
using Alpheratz.Presentation.Coordinators;
using Alpheratz.Contracts.Infrastructure;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Presentation.ViewModels;

/// <summary>
/// Top-level ViewModel coordinating the main application shell and navigation.
/// Follows Design Doc Section 8.2 / 433.
/// </summary>
public partial class ShellViewModel : ObservableObject
{
    private readonly InitializeApplicationUseCase _initializeApplication;
    private readonly NavigationCoordinator _navigation;
    private readonly ToastCoordinator _toast;
    private readonly ILoggingFacade _logger;

    [ObservableProperty]
    private bool _isScanning;

    [ObservableProperty]
    private string _scanStatus = string.Empty;

    [ObservableProperty]
    private double _scanProgress;

    [ObservableProperty]
    private ObservableCollection<NavigationItem> _navigationItems = new();

    [ObservableProperty]
    private NavigationItem? _selectedNavigationItem;

    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private bool _isFirstRunActive;

    [ObservableProperty]
    private bool _isOverlayVisible;

    [ObservableProperty]
    private bool _isRightPaneVisible;

    [ObservableProperty]
    private bool _isDialogActive;

    public GalleryPageViewModel GalleryPage { get; }
    public FirstRunPageViewModel FirstRunPage { get; }
    public SettingsPageViewModel SettingsPage { get; }
    public TagMasterPageViewModel TagMasterPage { get; }
    public TweetTemplatePageViewModel TweetTemplatePage { get; }

    public ShellViewModel(
        GalleryPageViewModel galleryPage,
        FirstRunPageViewModel firstRunPage,
        SettingsPageViewModel settingsPage,
        TagMasterPageViewModel tagMasterPage,
        TweetTemplatePageViewModel tweetTemplatePage,
        InitializeApplicationUseCase initializeApplication,
        NavigationCoordinator navigation,
        ToastCoordinator toast,
        ILoggingFacade logger)
    {
        GalleryPage = galleryPage;
        FirstRunPage = firstRunPage;
        SettingsPage = settingsPage;
        TagMasterPage = tagMasterPage;
        TweetTemplatePage = tweetTemplatePage;
        
        _initializeApplication = initializeApplication;
        _navigation = navigation;
        _toast = toast;
        _logger = logger;
        
        // Listen to FirstRun completion
        FirstRunPage.SetupCompleted += OnSetupCompleted;

        SetupNavigationItems();
    }

    private void SetupNavigationItems()
    {
        NavigationItems.Add(new NavigationItem("Gallery", "Gallery"));
        NavigationItems.Add(new NavigationItem("Settings", "Settings"));
        NavigationItems.Add(new NavigationItem("TagMaster", "Tags"));
        NavigationItems.Add(new NavigationItem("TweetTemplate", "Tweets"));
        
        SelectedNavigationItem = NavigationItems.First();
    }

    private void OnSetupCompleted()
    {
        _logger.Info("Shell", "SetupComplete", "First run setup completed. Launching main gallery.");
        IsFirstRunActive = false;
        _navigation.LaunchMainGallery();
    }

    /// <summary>
    /// Initializes application state and decides whether to show first-run or gallery.
    /// </summary>
    public async Task InitializeAsync()
    {
        IsBusy = true;
        _logger.Info("Shell", "Initialize", "Shell initialization sequence started.");
        try
        {
            var isFirstRun = await _initializeApplication.ExecuteAsync();
            IsFirstRunActive = isFirstRun;

            if (isFirstRun)
            {
                _navigation.Navigate("FirstRun");
            }
            else
            {
                _navigation.Navigate("Gallery");
                // Initial refresh or pre-warm could go here
                _ = GalleryPage.RefreshPhotosAsync();
            }
        }
        catch (System.Exception ex)
        {
            _logger.Error("Shell", "Initialize", "Critical failure during shell initialization.", ex);
            _toast.ShowError("Initialization Failed", "The application could not be started correctly. Check logs for details.");
        }
        finally
        {
            IsBusy = false;
        }
    }

    partial void OnSelectedNavigationItemChanged(NavigationItem? value)
    {
        if (value == null) return;
        _navigation.Navigate(value.Key);
    }

    /// <summary>
    /// Utility to show a toast message from anywhere using shell context.
    /// </summary>
    public void NotifyUser(string title, string message, bool isError = false)
    {
        if (isError)
            _toast.ShowError(title, message);
        else
            _toast.ShowSuccess(title, message);
    }

    [RelayCommand]
    public void ToggleRightPane()
    {
        IsRightPaneVisible = !IsRightPaneVisible;
    }

    [RelayCommand]
    public void GlobalSearch()
    {
        // Focus search box or open search flyout
        // Implementation can be handled via Messenger or direct reference to View's search element
    }
}
