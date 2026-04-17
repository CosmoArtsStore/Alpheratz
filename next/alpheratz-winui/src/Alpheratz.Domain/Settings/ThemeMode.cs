namespace Alpheratz.Domain.Settings;

/// <summary>
/// Defines the visual theme modes for the application.
/// </summary>
public enum ThemeMode
{
    /// <summary>
    /// Follow the Windows system setting.
    /// </summary>
    System,

    /// <summary>
    /// Force light theme.
    /// </summary>
    Light,

    /// <summary>
    /// Force dark theme.
    /// </summary>
    Dark
}

/// <summary>
/// Extension methods for <see cref="ThemeMode"/>.
/// </summary>
public static class ThemeModeExtensions
{
    public static string ToDisplayName(this ThemeMode mode) => mode switch
    {
        ThemeMode.System => "Windows Default",
        ThemeMode.Light => "Light",
        ThemeMode.Dark => "Dark",
        _ => "Unknown"
    };
}
