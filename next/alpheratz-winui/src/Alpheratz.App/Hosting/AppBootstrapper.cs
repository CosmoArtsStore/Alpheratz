using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Alpheratz.App.Hosting;

public static class AppBootstrapper
{
    public static IHost BuildHost()
    {
        // 依存関係、設定、ログ、データパス、外部統合を初期化する起動境界クラス
        var builder = Host.CreateDefaultBuilder();
            
        builder.ConfigureServices((context, services) =>
        {
            // DIコンテナを構成
            // services.AddSingleton<...>();
        });

        return builder.Build();
    }
}
