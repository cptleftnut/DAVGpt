package com.davgpt.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "Termux")
public class TermuxPlugin extends Plugin {

    // Open Termux app
    @PluginMethod
    public void openTermux(PluginCall call) {
        PackageManager pm = getActivity().getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage("com.termux");
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } else {
            // Termux not installed — open Play Store / F-Droid
            Intent store = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://f-droid.org/packages/com.termux/"));
            store.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(store);
            call.reject("Termux not installed. Opening download page.");
        }
    }

    // Run a bash command inside Termux terminal window
    @PluginMethod
    public void runCommand(PluginCall call) {
        String command = call.getString("command", "");
        if (command.isEmpty()) {
            call.reject("No command provided");
            return;
        }

        try {
            Intent intent = new Intent();
            intent.setClassName("com.termux", "com.termux.app.RunCommandService");
            intent.setAction("com.termux.RUN_COMMAND");
            intent.putExtra("com.termux.RUN_COMMAND_PATH",
                "/data/data/com.termux/files/usr/bin/bash");
            intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS",
                new String[]{"-c", command});
            intent.putExtra("com.termux.RUN_COMMAND_WORKDIR",
                "/data/data/com.termux/files/home");
            intent.putExtra("com.termux.RUN_COMMAND_TERMINAL", true);
            intent.putExtra("com.termux.RUN_COMMAND_SESSION_ACTION", "0");
            getActivity().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed: " + e.getMessage());
        }
    }

    // Check if Termux is installed
    @PluginMethod
    public void isInstalled(PluginCall call) {
        try {
            getActivity().getPackageManager().getPackageInfo("com.termux", 0);
            JSObject ret = new JSObject();
            ret.put("installed", true);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            JSObject ret = new JSObject();
            ret.put("installed", false);
            call.resolve(ret);
        }
    }
}
