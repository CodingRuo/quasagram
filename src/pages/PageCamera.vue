<template>
  <q-page class="constraint-more q-pa-md">
    <div class="camera-frame q-pa-md">
      <video v-show="!imageCaptured" class="full-width" autoplay ref="video" />
      <canvas
        v-show="imageCaptured"
        ref="canvas"
        class="full-width"
        height="240"
      />
    </div>
    <div class="text-center q-pa-md">
      <q-btn
        v-if="hasCameraSupport"
        color="grey-10"
        icon="eva-camera"
        round
        size="lg"
        @click="captureImage"
      />
      <q-file
        v-else
        outlined
        v-model="imageUpload"
        label="Choose an image"
        accept="image/*"
        @input="captureImageFallback"
      >
        <template v-slot:prepend>
          <q-icon name="eva-attach-outline" />
        </template>
      </q-file>
      <div class="row justify-center q-ma-md">
        <q-input
          v-model="post.caption"
          type="text"
          label="Caption"
          class="col col-sm-6"
          dense
        />
      </div>
      <div class="row justify-center q-ma-md">
        <q-input
          v-model="post.location"
          type="text"
          label="Location"
          class="col col-sm-6"
          dense
          :loading="pendingLocation"
        >
          <template v-slot:append>
            <q-btn
              v-if="!pendingLocation && locationSupported"
              @click="getLocation"
              round
              dense
              flat
              icon="eva-navigation-2-outline"
            />
          </template>
        </q-input>
      </div>
      <div class="row justify-center q-mt-lg">
        <q-btn
          color="primary"
          unelevated
          rounded
          label="Post Image"
          @click="postImage()"
        />
      </div>
    </div>
  </q-page>
</template>

<script>
import { uid } from "quasar";
require("md-gum-polyfill");

export default {
  name: "PageCamera",
  data() {
    return {
      post: {
        id: uid(),
        caption: "",
        location: "",
        photo: null,
        date: Date.now(),
      },
      imageCaptured: false,
      hasCameraSupport: true,
      imageUpload: [],
      pendingLocation: false,
    };
  },
  computed: {
    locationSupported() {
      if ("geolocation" in navigator) {
        return true;
      }
      return false;
    },
  },
  methods: {
    initCamera() {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
        })
        .then((stream) => {
          this.$refs.video.srcObject = stream;
        })
        .catch((error) => {
          this.hasCameraSupport = false;
        });
    },
    captureImage() {
      const canvas = this.$refs.canvas;
      const video = this.$refs.video;
      canvas.width = video.getBoundingClientRect().width;
      canvas.height = video.getBoundingClientRect().height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.imageCaptured = true;
      this.post.photo = this.dataURItoBlob(canvas.toDataURL("image/png"));
      this.disableCamera();
    },
    captureImageFallback(file) {
      this.post.photo = file;

      const canvas = this.$refs.canvas;
      const context = canvas.getContext("2d");

      var reader = new FileReader();
      reader.onload = (event) => {
        var img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          this.imageCaptured = true;
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    disableCamera() {
      this.$refs.video.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
    },
    dataURItoBlob(dataURI) {
      // convert base64 to raw binary data held in a string
      // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
      var byteString = atob(dataURI.split(",")[1]);

      // separate out the mime component
      var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

      // write the bytes of the string to an ArrayBuffer
      var ab = new ArrayBuffer(byteString.length);

      // create a view into the buffer
      var ia = new Uint8Array(ab);

      // set the bytes of the buffer to the correct values
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      // write the ArrayBuffer to a blob, and you're done
      var blob = new Blob([ab], { type: mimeString });
      return blob;
    },
    getLocation() {
      this.pendingLocation = true;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.getCityCountry(position);
          },
          (err) => {
            this.locationError();
          },
          { timeout: 7000 }
        );
      }
    },
    getCityCountry(position) {
      let apiURL = `http://api.positionstack.com/v1/reverse?access_key=ef69dcc28f6d45e965edc34ffc3aa4b4&query=${position.coords.latitude},${position.coords.longitude}&limit=1`;
      // let apiURL = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
      this.$axios
        .get(apiURL)
        .then((response) => {
          this.locationSuccess(response.data);
        })
        .catch((error) => {
          console.log(error);
          this.locationError();
        });
    },
    locationSuccess(result) {
      this.post.location = result.data[0].region;
      if (result.data[0].country) {
        this.post.location += `, ${result.data[0].country}`;
      }
      this.pendingLocation = false;
    },
    locationError() {
      this.pendingLocation = false;
      this.$q.dialog({
        title: "Error",
        message: "Could not find your location",
      });
    },
    postImage() {
      let formData = new FormData();
      for (let [key, value] of Object.entries(this.post)) {
        if (key === "photo") {
          formData.append(key, value, this.post.id + ".png");
        } else {
          formData.append(key, value);
        }
      }
      this.$axios
        .post(`${process.env.API}/createpost`, formData)
        .then((response) => {
          console.log(response);
          this.$q.dialog({
            title: "Success",
            message: "Your post has been successfully created",
          });
          this.$router.push("/");
        });
      // console.log(...formData);
    },
  },
  mounted() {
    this.initCamera();
  },
  beforeDestroy() {
    if (this.hasCameraSupport) {
      this.disableCamera();
    }
  },
};
</script>

<style lang="sass">
.camera-frame
  border: 2px solid $grey-10
  border-radius: 10px
</style>
