<?php

use App\Mail\ContactMessageMail;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Mail;

test('qualquer um pode enviar uma mensagem de contacto, sem autenticação, e dispara o email para a equipa', function () {
    Mail::fake();

    $response = $this->postJson('/api/v1/contact-messages', [
        'name' => 'Maria João',
        'email' => 'maria@example.com',
        'subject' => 'Dúvida sobre parceria',
        'message' => 'Gostava de saber mais sobre como ser parceiro.',
    ]);

    $response->assertStatus(201)->assertJsonPath('data.email', 'maria@example.com');

    expect(ContactMessage::where('email', 'maria@example.com')->exists())->toBeTrue();

    Mail::assertQueued(ContactMessageMail::class, function ($mail) {
        return $mail->contactMessage->email === 'maria@example.com'
            && $mail->envelope()->replyTo[0]->address === 'maria@example.com';
    });
});

test('o email de contacto renderiza sem erro', function () {
    $contactMessage = ContactMessage::factory()->create([
        'name' => 'Maria João',
        'subject' => 'Dúvida sobre parceria',
    ]);

    $html = (new ContactMessageMail($contactMessage))->render();

    expect($html)->toContain('Maria João')->toContain('Dúvida sobre parceria');
});

test('campos obrigatórios em falta são rejeitados com 422', function () {
    $this->postJson('/api/v1/contact-messages', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'subject', 'message']);
});
