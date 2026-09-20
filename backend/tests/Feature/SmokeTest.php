<?php

test('a request without a matching route returns 404', function () {
    $this->getJson('/api/v1/does-not-exist')->assertStatus(404);
});
