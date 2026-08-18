using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using System.Windows.Forms;

namespace LifeMate.CommandCenter.Desktop;

internal sealed record DesktopConfig(
    string SupabaseUrl,
    string SupabasePublishableKey,
    string AdminApiUrl
);

internal static class Program
{
    private const string AppName = "LifeMate Command Center";
    private static Process? _serverProcess;

    [STAThread]
    private static async Task<int> Main(string[] args)
    {
        using var mutex = new Mutex(true, @"Local\LifeMateCommandCenter", out var createdNew);
        if (!createdNew)
        {
            MessageBox.Show(
                "LifeMate Command Center is already running.",
                AppName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
            return 0;
        }

        AppDomain.CurrentDomain.ProcessExit += (_, _) => StopServer();

        try
        {
            var baseDirectory = AppContext.BaseDirectory;
            var config = LoadAndValidateConfig(Path.Combine(baseDirectory, "config.json"));
            var nodePath = Path.Combine(baseDirectory, "runtime", "node", "node.exe");
            var serverPath = Path.Combine(baseDirectory, "app", "server.js");
            var serverDirectory = Path.GetDirectoryName(serverPath)!;

            if (!File.Exists(nodePath) || !File.Exists(serverPath))
            {
                throw new InvalidOperationException(
                    "The Windows package is incomplete. Re-download the official LifeMate Command Center artifact."
                );
            }

            var port = GetFreeLoopbackPort();
            var localOrigin = new Uri($"http://127.0.0.1:{port}");
            _serverProcess = StartServer(nodePath, serverPath, serverDirectory, port, config);

            if (!await WaitForServerAsync(localOrigin, _serverProcess))
            {
                throw new InvalidOperationException(
                    "The local Command Center server did not become ready."
                );
            }

            if (args.Any(static arg => string.Equals(arg, "--smoke-test", StringComparison.OrdinalIgnoreCase)))
            {
                await VerifyDesktopSurfaceAsync(localOrigin);
                return 0;
            }

            var edgePath = FindMicrosoftEdge();
            if (edgePath is null)
            {
                throw new InvalidOperationException(
                    "Microsoft Edge was not found. LifeMate Command Center requires Microsoft Edge on Windows."
                );
            }

            var profileDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "LifeMate",
                "CommandCenter",
                "EdgeProfile"
            );
            Directory.CreateDirectory(profileDirectory);

            var edge = StartEdgeApp(edgePath, new Uri(localOrigin, "/login"), profileDirectory);
            await edge.WaitForExitAsync();
            return 0;
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                exception.Message,
                AppName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return 1;
        }
        finally
        {
            StopServer();
        }
    }

    private static DesktopConfig LoadAndValidateConfig(string path)
    {
        if (!File.Exists(path))
        {
            throw new InvalidOperationException("Command Center public configuration is missing.");
        }

        var raw = File.ReadAllText(path);
        var forbiddenTokens = new[]
        {
            "service_role",
            "service-role",
            "database_url",
            "db_url",
            "db_password",
            "vault_secret"
        };

        if (forbiddenTokens.Any(token => raw.Contains(token, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Unsafe privileged configuration was detected in the desktop package.");
        }

        var config = JsonSerializer.Deserialize<DesktopConfig>(
            raw,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        ) ?? throw new InvalidOperationException("Command Center public configuration is invalid.");

        if (!Uri.TryCreate(config.SupabaseUrl, UriKind.Absolute, out var supabaseUri) ||
            supabaseUri.Scheme != Uri.UriSchemeHttps ||
            !supabaseUri.Host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Supabase URL must be an HTTPS hosted Supabase origin.");
        }

        if (!Uri.TryCreate(config.AdminApiUrl, UriKind.Absolute, out var adminApiUri) ||
            adminApiUri.Scheme != Uri.UriSchemeHttps ||
            !string.Equals(adminApiUri.Host, supabaseUri.Host, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Admin API must use the same canonical HTTPS Supabase project.");
        }

        if (string.IsNullOrWhiteSpace(config.SupabasePublishableKey) ||
            !config.SupabasePublishableKey.StartsWith("sb_publishable_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Only a Supabase publishable key is allowed in the desktop package.");
        }

        return config;
    }

    private static int GetFreeLoopbackPort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        try
        {
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }
        finally
        {
            listener.Stop();
        }
    }

    private static Process StartServer(
        string nodePath,
        string serverPath,
        string workingDirectory,
        int port,
        DesktopConfig config
    )
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = nodePath,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        startInfo.ArgumentList.Add(serverPath);
        startInfo.Environment["HOSTNAME"] = "127.0.0.1";
        startInfo.Environment["PORT"] = port.ToString();
        startInfo.Environment["NODE_ENV"] = "production";
        startInfo.Environment["NEXT_PUBLIC_SUPABASE_URL"] = config.SupabaseUrl;
        startInfo.Environment["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] = config.SupabasePublishableKey;
        startInfo.Environment["NEXT_PUBLIC_ADMIN_API_URL"] = config.AdminApiUrl;
        startInfo.Environment["LIFEMATE_DESKTOP_HOST"] = "1";

        return Process.Start(startInfo) ?? throw new InvalidOperationException("Unable to start the local Command Center server.");
    }

    private static async Task<bool> WaitForServerAsync(Uri origin, Process serverProcess)
    {
        using var handler = new HttpClientHandler { AllowAutoRedirect = false };
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(2) };
        var target = new Uri(origin, "/login");

        for (var attempt = 0; attempt < 80; attempt++)
        {
            if (serverProcess.HasExited)
            {
                return false;
            }

            try
            {
                using var response = await client.GetAsync(target);
                if ((int)response.StatusCode < 500)
                {
                    return true;
                }
            }
            catch (HttpRequestException)
            {
            }
            catch (TaskCanceledException)
            {
            }

            await Task.Delay(250);
        }

        return false;
    }

    private static async Task VerifyDesktopSurfaceAsync(Uri origin)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };

        foreach (var path in new[] { "/login", "/manifest.webmanifest", "/sw.js" })
        {
            using var response = await client.GetAsync(new Uri(origin, path));
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Desktop smoke check failed for {path}: {(int)response.StatusCode}.");
            }
        }
    }

    private static string? FindMicrosoftEdge()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "Edge", "Application", "msedge.exe")
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static Process StartEdgeApp(string edgePath, Uri localUrl, string profileDirectory)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = edgePath,
            UseShellExecute = false
        };
        startInfo.ArgumentList.Add($"--app={localUrl.AbsoluteUri}");
        startInfo.ArgumentList.Add($"--user-data-dir={profileDirectory}");
        startInfo.ArgumentList.Add("--no-first-run");
        startInfo.ArgumentList.Add("--no-default-browser-check");
        startInfo.ArgumentList.Add("--disable-features=TranslateUI");

        return Process.Start(startInfo) ?? throw new InvalidOperationException("Unable to open the Command Center window.");
    }

    private static void StopServer()
    {
        try
        {
            if (_serverProcess is { HasExited: false })
            {
                _serverProcess.Kill(entireProcessTree: true);
                _serverProcess.WaitForExit(3000);
            }
        }
        catch
        {
            // Process cleanup is best-effort during application shutdown.
        }
        finally
        {
            _serverProcess?.Dispose();
            _serverProcess = null;
        }
    }
}
