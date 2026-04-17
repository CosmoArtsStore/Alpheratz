using Alpheratz.Presentation.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Alpheratz.Presentation.Views;

public sealed partial class PhotoDetailPaneView : UserControl
{
    public static readonly DependencyProperty ViewModelProperty =
        DependencyProperty.Register(nameof(ViewModel), typeof(PhotoDetailPaneViewModel), typeof(PhotoDetailPaneView), new PropertyMetadata(null));

    public PhotoDetailPaneViewModel ViewModel
    {
        get => (PhotoDetailPaneViewModel)GetValue(ViewModelProperty);
        set => SetValue(ViewModelProperty, value);
    }

    public PhotoDetailPaneView()
    {
        InitializeComponent();
        this.RegisterPropertyChangedCallback(ViewModelProperty, (s, e) => {
             if (ViewModel != null) {
                 ViewModel.PropertyChanged += (vs, ve) => {
                     if (ve.PropertyName == nameof(PhotoDetailPaneViewModel.CurrentPhoto) && ViewModel.CurrentPhoto != null) {
                         OpenAnimation.Begin();
                     }
                 };
             }
        });
    }
}
