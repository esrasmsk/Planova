package com.temayazilim.planova;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Hatirlatma alarm sesi (Web Audio) kullanici dokunmadan da calabilsin
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
