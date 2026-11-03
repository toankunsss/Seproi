package com.whipboss.game;

import android.content.pm.ApplicationInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells the web layer whether this is a debuggable build (debug APK) or the store release.
 * js/ads.js uses it to request Google's TEST ads in debug builds, so testing on your own phone
 * never touches the real ad unit (clicking your own live ads can get the AdMob account banned).
 */
@CapacitorPlugin(name = "BuildInfo")
public class BuildInfoPlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        boolean debug = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        JSObject result = new JSObject();
        result.put("debug", debug);
        call.resolve(result);
    }
}
