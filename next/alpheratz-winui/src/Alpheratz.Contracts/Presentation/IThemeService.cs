using Alpheratz.Domain.Settings;

namespace Alpheratz.Contracts.Presentation;

public interface IThemeService
{
    void ApplyTheme(ThemeMode themeMode);
}
