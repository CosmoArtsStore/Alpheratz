namespace Alpheratz.Contracts.Settings;

public interface ISettingsStore
{
    AppSettings Load();
}
