$presentationDir = "f:\DEVELOPFOLDER\Repositories\Alpheratz\next\alpheratz-winui\src\Alpheratz.Presentation"
$viewModelsDir = Join-Path $presentationDir "ViewModels"
$coordinatorsDir = Join-Path $presentationDir "Coordinators"
$pagesDir = Join-Path $presentationDir "Pages"
$viewsDir = Join-Path $presentationDir "Views"

New-Item -ItemType Directory -Force $viewModelsDir | Out-Null
New-Item -ItemType Directory -Force $coordinatorsDir | Out-Null
New-Item -ItemType Directory -Force $pagesDir | Out-Null
New-Item -ItemType Directory -Force $viewsDir | Out-Null

$vmFiles = @("ShellViewModel.cs", "GalleryPageViewModel.cs", "GalleryToolbarViewModel.cs", "GalleryQueryPanelViewModel.cs", "GallerySelectionViewModel.cs", "BulkActionBarViewModel.cs", "GalleryViewportViewModel.cs", "GalleryItemViewModel.cs", "PhotoDetailPaneViewModel.cs", "PhotoMetadataPanelViewModel.cs", "PhotoTagEditorViewModel.cs", "SimilarWorldDialogViewModel.cs", "SettingsPageViewModel.cs", "FirstRunPageViewModel.cs", "TagMasterPageViewModel.cs", "TweetTemplatePageViewModel.cs")

foreach ($file in $vmFiles) {
    Set-Content -Path (Join-Path $viewModelsDir $file) -Value "using CommunityToolkit.Mvvm.ComponentModel;`n`nnamespace Alpheratz.Presentation.ViewModels;`n`npublic partial class $([System.IO.Path]::GetFileNameWithoutExtension($file)) : ObservableObject {}"
}

$pageFiles = @("FirstRunPage.xaml", "GalleryPage.xaml", "SettingsPage.xaml", "TagMasterPage.xaml", "TweetTemplatePage.xaml")
foreach ($file in $pageFiles) {
    $className = [System.IO.Path]::GetFileNameWithoutExtension($file)
    Set-Content -Path (Join-Path $pagesDir $file) -Value "<Page x:Class=`"Alpheratz.Presentation.Pages.$className`" xmlns=`"http://schemas.microsoft.com/winfx/2006/xaml/presentation`" xmlns:x=`"http://schemas.microsoft.com/winfx/2006/xaml`"></Page>"
    Set-Content -Path (Join-Path $pagesDir ($file + ".cs")) -Value "using Microsoft.UI.Xaml.Controls;`n`nnamespace Alpheratz.Presentation.Pages;`n`npublic sealed partial class $className : Page {}"
}
